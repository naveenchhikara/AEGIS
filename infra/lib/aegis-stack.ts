import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";

export class AegisStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- VPC: Single public subnet, NO NAT gateway (saves $30+/mo) ---
    const vpc = new ec2.Vpc(this, "AegisVpc", {
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // --- Security Group ---
    const sg = new ec2.SecurityGroup(this, "AegisSG", {
      vpc,
      description: "AEGIS production security group",
      allowAllOutbound: true,
    });

    // SSH: restrict to your IP. Override with: cdk deploy -c sshCidr=1.2.3.4/32
    const sshCidr = this.node.tryGetContext("sshCidr") || "0.0.0.0/0";
    sg.addIngressRule(
      ec2.Peer.ipv4(sshCidr),
      ec2.Port.tcp(22),
      "SSH access (restrict via -c sshCidr=x.x.x.x/32)",
    );
    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "HTTP (Traefik redirect)",
    );
    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "HTTPS (Traefik TLS)",
    );
    // Coolify dashboard — restrict to your IP in production
    sg.addIngressRule(
      ec2.Peer.ipv4(sshCidr),
      ec2.Port.tcp(8000),
      "Coolify dashboard (restrict via -c sshCidr=x.x.x.x/32)",
    );

    // --- S3 Bucket for evidence storage ---
    const evidenceBucket = new s3.Bucket(this, "AegisEvidenceBucket", {
      bucketName: `aegis-evidence-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true,
      lifecycleRules: [
        {
          id: "backup-lifecycle",
          prefix: "backups/",
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          expiration: cdk.Duration.days(90),
        },
      ],
    });

    // --- IAM Role for EC2 ---
    const role = new iam.Role(this, "AegisEC2Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
      ],
    });

    evidenceBucket.grantReadWrite(role);

    // --- Key Pair (reference existing or create) ---
    const keyPairName = this.node.tryGetContext("keyPairName") || "aegis-prod";
    const keyPair = ec2.KeyPair.fromKeyPairName(
      this,
      "AegisKeyPair",
      keyPairName,
    );

    // --- User Data (bootstrap script) ---
    const userData = ec2.UserData.forLinux();
    const initScriptPath = path.join(__dirname, "../../scripts/ec2-init.sh");
    if (fs.existsSync(initScriptPath)) {
      const initScript = fs.readFileSync(initScriptPath, "utf-8");
      userData.addCommands(initScript);
    } else {
      // Fallback: install Coolify directly
      userData.addCommands(
        "curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash",
      );
    }

    // --- EC2 Instance: t3.small (2 vCPU, 2 GB RAM — Coolify minimum) ---
    const instance = new ec2.Instance(this, "AegisInstance", {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: sg,
      role,
      keyPair,
      userData,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(30, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
          }),
        },
      ],
    });

    // --- Elastic IP (free when attached to running instance) ---
    const eip = new ec2.CfnEIP(this, "AegisEIP", {
      instanceId: instance.instanceId,
    });

    // --- Outputs ---
    new cdk.CfnOutput(this, "InstanceId", {
      value: instance.instanceId,
      description: "EC2 Instance ID",
    });

    new cdk.CfnOutput(this, "PublicIP", {
      value: eip.attrPublicIp,
      description: "Elastic IP address",
    });

    new cdk.CfnOutput(this, "EvidenceBucketName", {
      value: evidenceBucket.bucketName,
      description: "S3 evidence bucket name",
    });

    new cdk.CfnOutput(this, "CoolifyDashboard", {
      value: `http://${eip.attrPublicIp}:8000`,
      description: "Coolify dashboard URL",
    });

    new cdk.CfnOutput(this, "SSHCommand", {
      value: `ssh -i ${keyPairName}.pem ec2-user@${eip.attrPublicIp}`,
      description: "SSH connection command",
    });
  }
}

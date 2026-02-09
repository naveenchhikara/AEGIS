import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID, scrypt, randomBytes } from "crypto";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });
const password = "Test1234!";

function hashPassword(pwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(
      pwd.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, key) => {
        if (err) reject(err);
        else resolve(salt + ":" + key.toString("hex"));
      },
    );
  });
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  console.log(
    "Found users:",
    users.map((u) => u.email),
  );

  for (const user of users) {
    const userHash = await hashPassword(password);
    try {
      await prisma.account.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: userHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log("Created account for:", user.email);
    } catch (e: any) {
      if (e.code === "P2002") {
        console.log("Account already exists for:", user.email);
      } else {
        console.log("Error for", user.email, ":", e.message);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="pcaStatus">
                    PCA Status <span className="text-red-500">*</span>
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="text-muted-foreground h-4 w-4 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-sm">
                          Prompt Corrective Action framework. Banks with
                          financial stress are placed under PCA with regulatory
                          restrictions.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={form.watch("pcaStatus")}
                  onValueChange={(val) =>
                    form.setValue("pcaStatus", val as PcaStatus)
                  }
                >
                  <SelectTrigger id="pcaStatus">
                    <SelectValue placeholder="Select PCA status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="PCA_1">PCA Level 1</SelectItem>
                    <SelectItem value="PCA_2">PCA Level 2</SelectItem>
                    <SelectItem value="PCA_3">PCA Level 3</SelectItem>
                  </SelectContent>
                </Select>
                {form.watch("pcaStatus") !== "NONE" && (
                  <p className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    Bank is under RBI&apos;s Prompt Corrective Action framework
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastRbiInspectionDate">
                Last RBI Inspection Date (Optional)
              </Label>
              <Input
                id="lastRbiInspectionDate"
                type="date"
                {...form.register("lastRbiInspectionDate")}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

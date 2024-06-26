import { Component, KnitServer as Knit } from "@rbxts/knit";
import { ServerScriptService } from "@rbxts/services";

const Services = ServerScriptService.WaitForChild("services")
const t = ServerScriptService.WaitForChild("TS")
const Components = t.WaitForChild("components") as Folder

Knit.AddServices(Services)
Knit.Start().await()
Component.Auto(Components)
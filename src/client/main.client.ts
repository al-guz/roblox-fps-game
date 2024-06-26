import { Component, KnitClient as Knit } from "@rbxts/knit";
import { StarterGui, StarterPlayer } from "@rbxts/services";

const StarterPlayerScripts = StarterPlayer.WaitForChild("StarterPlayerScripts")
const Controllers = StarterPlayerScripts.WaitForChild("controllers");
const ts = StarterPlayerScripts.WaitForChild("TS")
const Components = ts.WaitForChild("components")

const setCoreGuisEnabled = (guis : Enum.CoreGuiType[], enabled: boolean) => {
    guis.forEach((coreGui) => {
        StarterGui.SetCoreGuiEnabled(coreGui, enabled)
    })
}

Knit.AddControllers(Controllers)
Knit.Start().andThen(() => {
    print("Client Knit has been initialized")
}).await()
Component.Auto(Components)

setCoreGuisEnabled([
    Enum.CoreGuiType.Backpack,
    Enum.CoreGuiType.Captures,
    Enum.CoreGuiType.PlayerList,
    Enum.CoreGuiType.EmotesMenu,
], false)

// UserInputService.MouseBehavior = Enum.MouseBehavior.LockCenter
// UserInputService.MouseIcon = "rbxassetid://11780694017"
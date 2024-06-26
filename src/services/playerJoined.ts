import { KnitServer as Knit } from "@rbxts/knit";
import { CaptureService, Players } from "@rbxts/services";

declare global {
    interface KnitServices {
        playerJoined: typeof playerJoined;
    }
}

const createfolder = (name : string, parent: Instance) : Folder => {
    const folder = new Instance("Folder")
    folder.Name = name
    folder.Parent = parent
    return folder
}

const createStringValue = (name: string, parent: Instance, value : string | undefined) : StringValue => {
    const stringValue = new Instance("StringValue")
    stringValue.Value = value || ""
    stringValue.Name = name
    stringValue.Parent = parent
    return stringValue
}

const createBoolValue = (name: string, parent: Instance, value : boolean | undefined) : BoolValue => {
    const BoolValue = new Instance("BoolValue")
    BoolValue.Value = value || false
    BoolValue.Name = name
    BoolValue.Parent = parent
    return BoolValue
}

const playerJoined = Knit.CreateService({
    Name: "playerJoined",
    OriginSpeed: 34,
    DefaultDashCharges: 3,
    MaxDashCharges: 3,

    Client: {},

    KnitInit() {
    },

    KnitStart() {
        Players.PlayerAdded.Connect((player) => {
            const stats = createfolder("stats", player)
            const equippedRn = createStringValue("currentlyEquipped", stats, "rocketlauncher")
            const primary = createStringValue("primary", stats, "rocketlauncher")
            const secondary = createStringValue("secondary", stats, "lasergun")
            const special = createStringValue("special", stats, "ice")

            const debounces = createfolder("debounces", player)
            const primaryDebounce = createBoolValue("primary", debounces, false)
            const secondaryDebounce = createBoolValue("secondary", debounces, false)
            const specialDebounce = createBoolValue("special", debounces, false)
            const dash = createBoolValue("dash", debounces, false)
            
            player.CharacterAdded.Connect((character) => {
                const humanoid = character.WaitForChild("Humanoid") as Humanoid

                humanoid.WalkSpeed = this.OriginSpeed
                character.SetAttribute("speedOrigin", this.OriginSpeed)
                character.SetAttribute("speedMult", 1)
                character.SetAttribute("speedReduce", 1)

                character.SetAttribute("dashCharges", this.DefaultDashCharges)
                character.SetAttribute("maxDashCharges", this.MaxDashCharges)

                character.AddTag("viewmodel")
                character.AddTag("thirdPerson")

                const characterDescendants = character.GetDescendants()
                characterDescendants.forEach((v) => {
                    if (v.IsA("BasePart")) {
                        v.CollisionGroup = "Character"
                    }
                })

                humanoid.Died.Once(() => {
                    character.RemoveTag("viewmode")
                    character.RemoveTag("thirdPerson")
                })
            })
            player.CharacterRemoving.Connect((character) => {
                equippedRn.Value = primary.Value
            })
        })
    },
});

export = playerJoined;
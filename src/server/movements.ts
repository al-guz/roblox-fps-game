import { Players } from "@rbxts/services"
import { activate, findBoolValue, isActive } from "shared/debounces"
import { knockback as linearVelocity } from "./fires"

export async function clearLinearVelocitiesIn(instance: Instance) {
    instance.GetChildren().forEach((instance_) => {
        if (instance_.IsA("LinearVelocity")) {
            instance_.Destroy()
        }
    })
}

export function dash(character: Model) {
    const humanoidRootPart = character.WaitForChild("HumanoidRootPart") as Part
    const humanoid = character.WaitForChild("Humanoid") as Humanoid
    const rt = humanoidRootPart.WaitForChild("RootAttachment") as Attachment
    const player = Players.GetPlayerFromCharacter(character)
    if (!player || !rt || !humanoid) {return}
    const dashDebounce = findBoolValue(player, "dash")
    if (!dashDebounce) {return}
    if (isActive(dashDebounce)) {return}
    clearLinearVelocitiesIn(humanoidRootPart)
    
    const lv = linearVelocity(humanoidRootPart, rt, humanoid.MoveDirection.mul(100), .3)
    lv.MaxAxesForce = new Vector3(25000, 0, 25000)

    activate(dashDebounce, .3)
}
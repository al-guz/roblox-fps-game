import { KnitServer as Knit, TableUtil } from "@rbxts/knit";
import { Workspace } from "@rbxts/services";
import { NetworkEvent } from "@rbxts/ts-remote";
import { getAccessoriesInWorkspace, toPosition } from "server/toPosition";
import { fireRequest, mobilityRequest } from "shared/remotes";
import { categoryEquipped, laserGun, rocketLauncher } from "server/fires"
import { activate, findBoolValue, isActive } from "shared/debounces";
import { dash } from "server/movements";
import { reject } from "@rbxts/knit/Knit/Util/Promise";

declare global {
    interface KnitServices {
        combat: typeof combat;
    }
}

const combat = Knit.CreateService({
    Name: "combat",

    Client: {
    },

    setSpeed(character: Model, humanoid: Humanoid, speed?: number, duration? : number) {
        if (!speed) {
            const speedReducer = character.GetAttribute("speedReducer") as number | undefined
            const speedMult = character.GetAttribute("speedMult") as number | undefined
            const speed_ = character.GetAttribute("speedOrigin") as number | undefined
            if (!speedReducer || !speedMult || !speed_) {
                return reject(`nub theres no speedReducerAttribute : ${speedReducer}  speedMul : ${speedMult}  originSpeed : ${speed_}`)
            }
            speed = (speed_*speedMult)/speedReducer
        }

        if (!speed) {
            return reject("still no value given for speed")
        }

        humanoid.WalkSpeed = speed
        if (duration) {
            Promise.delay(duration)
            .andThen(() => this.setSpeed(character, humanoid))
        }
    },

    canDashCharge(character: Model) : boolean | undefined  {
        const currentDashCharges = character.GetAttribute("dashCharges") as number | undefined
        if (currentDashCharges === undefined) {return}
        return currentDashCharges > 0
    },

    decreaseDashCharge(character: Model, decrement: number) : void {
        const currentDashCharges = character.GetAttribute("dashCharges") as number | undefined
        if (!currentDashCharges) {print("returned A");return}
        if (!this.canDashCharge(character)) {print("returned");return}
        character.SetAttribute("dashCharges", currentDashCharges-decrement)
    },

    incrementDashCharge(character: Model, increment: number) : void {
        const currentDashCharges = character.GetAttribute("dashCharges") as number | undefined
        if (currentDashCharges === undefined) {return}
        character.SetAttribute("dashCharges", currentDashCharges+increment)
    },

    KnitInit() {

    },

    KnitStart() {
        const FireRequestRemote = new NetworkEvent<fireRequest>("fireRequest")
        const mobilityRequest = new NetworkEvent<mobilityRequest>("mobilityRequest")

        // conencting events
        FireRequestRemote.onServerEvent.Connect((player, ray) => {
            const character = player.Character
            const humanoidRootPart = character?.WaitForChild("HumanoidRootPart") as Part
            const humanoid = character?.WaitForChild("Humanoid") as Humanoid
            const equippedRn = player.WaitForChild("stats")?.WaitForChild("currentlyEquipped") as StringValue
            const currentCategory = categoryEquipped(player)
            if (!currentCategory || !humanoidRootPart || !humanoid) {return}
            const debounce = findBoolValue(player, currentCategory)
            if (!character || !equippedRn || !debounce) {;return}
            if (isActive(debounce)) {return}``
            if (humanoid.Health <= 0) {return}

            debounce.Value = true
            const FX = Workspace.WaitForChild("FX") as Folder
            // raycastParmas
            const raycastParams = new RaycastParams()
            let ignore = [FX, character]
            const accessories = getAccessoriesInWorkspace()
            TableUtil.Extend(ignore, accessories)
            raycastParams.FilterDescendantsInstances = ignore
            raycastParams.FilterType = Enum.RaycastFilterType.Exclude
            //raycasting
            const [mpos, raycastSuccess, raycastResult] = toPosition(ray.Origin, ray.Direction.mul(999), raycastParams)
            const equippedRnString = equippedRn.Value.lower()
            let cooldown : undefined | number
            
            let reload = false
            
            if (equippedRnString === "rocketlauncher") {
                reload = false
                cooldown = .6
                rocketLauncher(player, mpos, raycastSuccess)
            } else if (equippedRnString === "lasergun") {
                reload = true
                cooldown = 1.3
                laserGun(player, mpos, raycastSuccess, raycastResult)
            }
            
            if (!cooldown) {return}
            activate(debounce, cooldown)
            FireRequestRemote.fireClient(player, reload)
        })
        
        mobilityRequest.onServerEvent.Connect((player, mobtype) => {
            const character = player.Character
            if (!character) {return}
            const humanoidRootPart = character.WaitForChild("HumanoidRootPart") as Part
            const humanoid = character.WaitForChild("Humanoid") as Humanoid
            if (!humanoidRootPart || !humanoid) {return}
            if (humanoid.Health <= 0) {return}
            if (mobtype === "dash") {
                if (!this.canDashCharge(character)) {return}
                this.decreaseDashCharge(character, 1)
                dash(character)
            }
        })
    },
});

export = combat;
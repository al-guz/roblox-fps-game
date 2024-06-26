import { Component, Janitor } from "@rbxts/knit";
import { CollectionService, Players, ServerStorage, Workspace } from "@rbxts/services";
import { NetworkEvent } from "@rbxts/ts-remote";
import { categoryEquipped } from "server/fires";
import { fireRequestComponent, switchWeaponRequest } from "shared/remotes";
import {ice} from "server/specialFires";
import { toPosition } from "server/toPosition";
import combat from "services/combat";

const findWeapon = (weaponName: string): Folder | undefined => {
    weaponName = weaponName.lower()

    const weapons = ServerStorage.WaitForChild("assets").WaitForChild("weapons")
    let results : Folder | undefined = undefined
    Promise.each(weapons.GetChildren(), (instance) => {
        if (instance.Name.lower() === weaponName && instance.IsA("Folder")) {
            results = instance
        }
    })

    return results
}

class thirdPerson implements Component.ComponentClass {
    public static Tag = "thirdPerson";
    //primary & secondary meshes
    public primaryWeaponMesh : MeshPart | undefined
    public secondaryWeaponMesh : MeshPart | undefined
    // junk
    public player : Player | undefined
    public animator : Animator | undefined
    public janitor = new Janitor();
    public humanoidRootPart : Part | undefined
    public torso : Part | undefined
    public instance : Model | undefined
    public idleAnimation : AnimationTrack | undefined
    public currentlyEquipped : StringValue | undefined
    //remotes
    public fireComponentRequest = new NetworkEvent<fireRequestComponent>("fireRequestComponent")
    public switchWeaponRequest = new NetworkEvent<switchWeaponRequest>("switchWeaponRequest")
    // stats (primary, special, etc)
    public stats : Folder | undefined
    public primaryVal : StringValue | undefined
    public secondaryVal : StringValue | undefined

    constructor(instance: Instance) {
        if (!instance.IsA("Model")) {return}
        this.player = Players.GetPlayerFromCharacter(instance)
        this.humanoidRootPart = instance.WaitForChild("HumanoidRootPart") as Part
        this.animator = instance.FindFirstChildOfClass("Humanoid")?.FindFirstChildOfClass("Animator") as Animator
        this.torso = instance.WaitForChild("Torso") as Part
        this.instance = instance
        this.stats = this.player?.WaitForChild("stats") as Folder
        this.currentlyEquipped = this.stats.FindFirstChild("currentlyEquipped") as StringValue
        this.primaryVal = this.stats.WaitForChild("primary") as StringValue
        this.secondaryVal = this.stats.WaitForChild("secondary") as StringValue

        const humanoid = instance.WaitForChild("Humanoid") as Humanoid

        this.janitor.Add(this.fireComponentRequest.onServerEvent.Connect(() => {
            this.playAnimation("fire")
        }))

        this.janitor.Add(this.switchWeaponRequest.onServerEvent.Connect((player, weaponCategoryRequested, unitRay?: Ray) => {
            if (weaponCategoryRequested === categoryEquipped(player)) {return}
            if (weaponCategoryRequested === "primary") {
                this.switchWeapon("primary")
            } else if (weaponCategoryRequested === "secondary") {
                this.switchWeapon("secondary")
            } else if (weaponCategoryRequested === "special" && unitRay) {
                const rp = new RaycastParams()
                rp.FilterDescendantsInstances = [instance, Workspace.WaitForChild("FX")]
                rp.FilterType = Enum.RaycastFilterType.Exclude

                const [results, _] = toPosition(unitRay.Origin, unitRay.Direction.mul(500), rp)
                ice(player, results)
            }
            // special will be for later
        }))

        this.janitor.Add(instance.GetAttributeChangedSignal("dashCharges").Connect(() => {
            const dashCharges = instance.GetAttribute("dashCharges") as number | undefined
            const maxDashCharges = instance.GetAttribute("maxDashCharges") as number | undefined
            if (dashCharges === undefined || maxDashCharges === undefined) {print("L");return}
            if (dashCharges >= maxDashCharges) {print("W");return}
            this.janitor.Remove("chargingDashPromise" as never)
            this.janitor.Add(new Promise((resolve, reject, onCancel) => {
                task.wait(.8)
                while (dashCharges <= maxDashCharges || !onCancel()) {
                    const dashCharges_ = instance.GetAttribute("dashCharges") as number | undefined
                    if (dashCharges_ === undefined) {return}
                    if (dashCharges_ >= maxDashCharges) {break}
                    if (humanoid.FloorMaterial !== Enum.Material.Air) {
                        combat.incrementDashCharge(instance, 1)
                    }
                    task.wait(.4)
                }
                resolve(undefined)
            }), "cancel", "chargingDashPromise")
        }), "Disconnect", "dashChargeAttributeChanged")
    }

    Init() {
        if (!this.player || !this.humanoidRootPart || !this.torso || !this.primaryVal || !this.secondaryVal) {return}
        // finding meshes of primary & secondary
        const primaryFolder = findWeapon(this.primaryVal.Value)
        const secondaryFolder = findWeapon(this.secondaryVal.Value)
        
        if (primaryFolder) {
            const weapon_mesh = this.janitor.Add(primaryFolder.WaitForChild("weapon_mesh").Clone()) as MeshPart
            weapon_mesh.CFrame = this.humanoidRootPart.CFrame
            weapon_mesh.AddTag("primary")
            weapon_mesh.Name = weapon_mesh.GetAttribute("name") as string
            weapon_mesh.Parent = this.instance

            const motor6d = this.janitor.Add(new Instance("Motor6D"))
            motor6d.Part0 = this.torso
            motor6d.Part1 = weapon_mesh
            motor6d.Name = weapon_mesh.Name.lower()
            motor6d.Parent = this.torso

            this.primaryWeaponMesh = weapon_mesh
        }

        if (secondaryFolder) {
            const weapon_mesh = this.janitor.Add(secondaryFolder.WaitForChild("weapon_mesh").Clone()) as MeshPart
            weapon_mesh.Position = this.humanoidRootPart.CFrame.Position
            weapon_mesh.AddTag("secondary")
            weapon_mesh.Name = weapon_mesh.GetAttribute("name") as string
            weapon_mesh.Parent = this.instance

            const motor6d = this.janitor.Add(new Instance("Motor6D"))
            motor6d.Part0 = this.torso
            motor6d.Part1 = weapon_mesh
            motor6d.Name = weapon_mesh.Name.lower()
            motor6d.Parent = this.torso

            this.secondaryWeaponMesh = weapon_mesh
        }

        const caterogyEquipped_ = categoryEquipped(this.player)
        if (!caterogyEquipped_) {return}
        this.switchWeapon(caterogyEquipped_)
    }

    switchWeapon(primaryOrSecondary : "secondary" | "primary") {
        assert(this.currentlyEquipped, `no currentlyEquipped found in ${this.player}`)
        assert(this.primaryWeaponMesh || this.secondaryWeaponMesh, "no primary/secondary weapon mesh found!")
        let opp : "primary" | "secondary" | undefined
        if (primaryOrSecondary === "primary") {
            opp = "secondary"
        } else {
            opp = "primary"
        }

        const mcWeaponModel = this.findWeaponOfCatergory(primaryOrSecondary)
        const oppWeaponModel = this.findWeaponOfCatergory(opp)
        assert(mcWeaponModel, "no found of main weapon mesh")
        assert(oppWeaponModel, "no found opp weapon mesh")
        mcWeaponModel.Transparency = 0
        oppWeaponModel.Transparency = 1
        
        this.currentlyEquipped.Value = mcWeaponModel.Name
        this.playIdle()
    }

    findWeaponOfCatergory(primaryOrSecondary : "secondary" | "primary") : MeshPart | undefined {
        assert(this.instance, "no found players character")
        let results : MeshPart | undefined = undefined
        Promise.each(this.instance?.GetChildren(), (instance : MeshPart | any) => {
            if (CollectionService.HasTag(instance, primaryOrSecondary) && !results) {
                results = instance
            }
        })
        return results
    }

    playIdle() {
        if (!this.player || !this.animator) {return}
        const stats = this.player.WaitForChild("stats")
        const currentlyEquipped = stats.WaitForChild("currentlyEquipped") as StringValue
        const weaponAnimations = findWeapon(currentlyEquipped.Value)?.FindFirstChild("animations") as Folder
        if (!weaponAnimations) {return}
        const idle = weaponAnimations.FindFirstChild("idle") as Animation
        if (!idle) {return}
        const idleTrack = this.animator.LoadAnimation(idle)
        idleTrack.Play()
        this.idleAnimation = idleTrack
        this.idleAnimation.Play()
    }

    playAnimation(animationName: string) {
        assert(this.animator, "no found animator")
        assert(this.player, "no found player")
        const stats = this.player.WaitForChild("stats")
        const currentlyEquipped = stats.WaitForChild("currentlyEquipped") as StringValue
        const weaponAnimations = findWeapon(currentlyEquipped.Value)?.FindFirstChild("animations") as Folder
        if (!weaponAnimations) {print("returned 1");return}
        const animation = weaponAnimations.FindFirstChild(animationName) as Animation
        if (!animation) {print("returned 2");return}
        this.janitor.Remove(animationName.upper() as never)
        const track = this.janitor.Add(this.animator.LoadAnimation(animation), "Destroy", animationName.upper())
        track.Play()
    }

    stopIdle() {
        assert(this.idleAnimation, "self.idleAnimation is nil bcuz no animationTrack has been set")
        this.idleAnimation.Stop()
        this.idleAnimation = undefined
    }

    public Destroy() {
        this.stopIdle()
        this.janitor.Cleanup()
    }
}

export = thirdPerson;
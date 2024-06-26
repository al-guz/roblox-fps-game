import { Debris, Workspace, Players } from "@rbxts/services"
import { detect } from "./hitbox"
import { tween } from "shared/tween"
import { NetworkFunction } from "@rbxts/ts-remote"
import { getClientCFrame } from "shared/remotes"

const FX = Workspace.WaitForChild("FX") as Folder
const getClientCFrame = new NetworkFunction<getClientCFrame>("getClientCFrame") 

export function knockback(parent : Instance, attachment: Attachment, velocity : Vector3, duration:number) {
    const linearVelocity = new Instance("LinearVelocity")
    linearVelocity.Attachment0 = attachment
    linearVelocity.VectorVelocity = velocity
    linearVelocity.ForceLimitMode = Enum.ForceLimitMode.PerAxis
    linearVelocity.MaxAxesForce = Vector3.one.mul(35000)
    linearVelocity.Parent = parent
    Debris.AddItem(linearVelocity, duration)

    return linearVelocity
}

const createBoolValue = (name: string, parent: Instance, value : boolean | undefined) : BoolValue => {
    const BoolValue = new Instance("BoolValue")
    BoolValue.Value = value || false
    BoolValue.Name = name
    BoolValue.Parent = parent
    return BoolValue
}

export async function rocketLauncher(player: Player, mousePosition : Vector3, raycastSuccess: boolean) {
    const character = player.Character
    if (!character) {return}
    const clientHrpCFrame = getClientCFrame.invokeClient(player, "RightGripAttachment")
    const rocketLauncher = character.WaitForChild("rocketlauncher") as MeshPart
    if (!clientHrpCFrame || !rocketLauncher) {return}
    const swoosh = rocketLauncher.WaitForChild("Swoosh") as Sound
    const boom = rocketLauncher.WaitForChild("Boom") as Sound
    if (!boom || !swoosh) {return}
    
    let block : Part | undefined = new Instance("Part")
    block.CFrame = new CFrame(clientHrpCFrame.Position, mousePosition)
    block.CanCollide = false
    block.Name = "block_missile"
    block.Size = new Vector3(1, 1, 2)
    block.Color = Color3.fromRGB(59, 133, 245)
    block.Parent = FX
    if (!raycastSuccess) {Debris.AddItem(block, 4)}

    // block.SetNetworkOwner(player)
    
    const attachment = new Instance("Attachment")
    attachment.Name = "attach"
    attachment.Parent = block

    const linearVelocity = new Instance("LinearVelocity")
    linearVelocity.Attachment0 = attachment
    linearVelocity.ForceLimitMode = Enum.ForceLimitMode.PerAxis
    linearVelocity.MaxAxesForce = Vector3.one.mul(25000)
    linearVelocity.VectorVelocity = new CFrame(clientHrpCFrame.Position, mousePosition).LookVector.mul(250)
    linearVelocity.Parent = block

    const op = new OverlapParams()
    op.FilterDescendantsInstances = [FX, character]
    op.FilterType = Enum.RaycastFilterType.Exclude

    swoosh.Play()

    const detectExplode = (Character: Model, humanoid: Humanoid, p: Part) => {
        if (!Character || !humanoid) {return}
        if (Character.FindFirstChild(`${player.UserId}_rocketDebounce`)) {return}
        const HumanoidRootPart = Character.WaitForChild("HumanoidRootPart") as Part
        const rt = HumanoidRootPart.WaitForChild("RootAttachment") as Attachment
        const player_ = Players.GetPlayerFromCharacter(Character)

        const debounce = createBoolValue(`${player.UserId}_rocketDebounce`, Character, undefined)
        Debris.AddItem(debounce, .6)
        
        let velocity
        let isShooter
        if (!player_) {
            velocity = new CFrame(p.Position, HumanoidRootPart.Position).LookVector.mul(80)
            isShooter = false
        } else {
            isShooter = player_?.UserId === player.UserId ? true : false
            const clientcf = getClientCFrame.invokeClient(player_, "HumanoidRootPart")
            const velocity_ = HumanoidRootPart.GetVelocityAtPosition(HumanoidRootPart.Position).mul(1.5)
            if (clientcf) {
                velocity = new CFrame(p.Position, HumanoidRootPart.Position).ToWorldSpace(new CFrame(velocity_)).LookVector.mul(80)
            }
        }

        if (!isShooter) {
            humanoid.TakeDamage(30)
        }
        if (!velocity) {return}
        HumanoidRootPart.GetChildren().forEach((instance_) => {
            if (instance_.IsA("LinearVelocity")) {
                instance_.Destroy()
            }
        })
        const knock = knockback(HumanoidRootPart, rt, velocity, .3)
        knock.MaxAxesForce = Vector3.one.mul(45000)
    }

    const explode = () => {
        if (!block) {return}
        const cframe = raycastSuccess ? new CFrame(mousePosition) : block.CFrame
        const explode = new Instance("Part")
        explode.CanCollide = false
        explode.Anchored = true
        explode.CFrame = cframe
        explode.Size = Vector3.one
        explode.Color = Color3.fromRGB(240, 65, 65)
        explode.Shape = Enum.PartType.Ball
        explode.Material = Enum.Material.Neon
        explode.CastShadow = false
        explode.Parent = FX

        const explodeSfx = boom.Clone()
        explodeSfx.Parent = explode
        explodeSfx.Play()

        Debris.AddItem(explodeSfx, explodeSfx.TimeLength+.5)

        if (block) {block.Destroy()} 

        block = undefined

        tween(explode, new TweenInfo(1), {
            Size: Vector3.one.mul(15),
            Transparency: 1,
        }).andThen(() => explode.Destroy())
        
        for (let index = 0; index < 10; index++) {
            detect(explode.CFrame, Vector3.one.mul(15), undefined, (character?: Model, humanoid?: Humanoid) => {
                if (!character || !humanoid) {return}
                detectExplode(character, humanoid, explode)
            })
            task.wait(.025)
        }
    }

    const detectedCallback = () => {
        explode()
    }

    while (block) {
        detect(block.CFrame, new Vector3(1, 1, 2), op, detectedCallback)
        task.wait()
    }
}

export async function laserGun(player: Player, mousePosition: Vector3, raycastSuccess: boolean, raycastResult: RaycastResult | undefined) {
    const character = player.Character
    if (!character) {return}
    const humanoidRootPart = character.WaitForChild("HumanoidRootPart") as Part
    const clientHrpCFrame = getClientCFrame.invokeClient(player, "RightGripAttachment")
    const lasergun = character.WaitForChild("lasergun") as MeshPart
    if (!clientHrpCFrame || !lasergun) {return}
    const fire = lasergun.WaitForChild("Fire") as Sound
    const reload = lasergun.WaitForChild("Reload") as Sound
    const hit = lasergun.WaitForChild("HitFade") as Sound
    if (!fire || !reload || !hit) {return}

    fire.Play()
    fire.Ended.Once(() => reload.Play())

    const distance = (clientHrpCFrame.Position.sub(mousePosition)).Magnitude

    const laser = new Instance("Part")
    laser.CFrame = new CFrame(clientHrpCFrame.Position, mousePosition).ToWorldSpace(new CFrame(0, 0, distance/-2))
    laser.CanCollide = false
    laser.Anchored = true
    laser.Name = "laserGun_shot"
    laser.Size = new Vector3(.8, .8, distance)
    laser.Color = Color3.fromRGB(59, 133, 245)
    laser.Material = Enum.Material.Neon
    laser.Parent = FX

    tween(laser, new TweenInfo(), {
        Size: new Vector3(.05, .05, distance),
        Transparency: 1
    }).andThen(() => laser.Destroy())

    const finish = (parent: Instance, model: Model) => {
        const hit_ = hit.Clone()
        hit_.Parent = parent

        hit_.Play()
        Debris.AddItem(hit_, hit_.TimeLength+.5)

        model.GetDescendants().forEach((instance) => {
            if (instance.IsA("BasePart")) {
                const isParentAccessory = instance.FindFirstAncestorOfClass("Accessory")
                if (instance.Name.lower() !== "humanoidrootpart" && !isParentAccessory) {
                    instance.CFrame = instance.CFrame
                    instance.Anchored = true
                    instance.CanCollide = false
                    instance.BrickColor = new BrickColor("Tr. Blue")
                    instance.Material = Enum.Material.Neon

                    // instance.ClearAllChildren()

                    const rngX = math.random(-180, 180)
                    const rngY = math.random(-180, 180)
                    const rngZ = math.random(-180, 180)
                    const randomCFrame = new CFrame(0, 4, 0).ToWorldSpace(CFrame.Angles(math.rad(rngX),math.rad(rngY),math.rad(rngZ)))

                    tween(instance, new TweenInfo(1), {
                        Transparency: 1,
                        CFrame: instance.CFrame.ToWorldSpace(randomCFrame),
                    })
                    // .andThen(() => instance.Destroy())
                }
            } else if (instance.IsA("Decal")) {
                instance.Transparency = 1
            }
        })
    }

    const detect = () => {
        if (!raycastResult) {return}
        const rayinstance = raycastResult.Instance
        const model = rayinstance.FindFirstAncestorOfClass("Model")
        if (!model) {return}
        const humanoid = model.WaitForChild("Humanoid") as Humanoid
        if (!humanoid) {return}
        if (rayinstance.Name.lower() === "head") {
            humanoid.TakeDamage(humanoid.Health)
            finish(rayinstance, model)
        } else {
            humanoid.TakeDamage(80)
        }
    }

    if (raycastResult) {
        //explode
        const mindBlowing = new Instance("Part")
        mindBlowing.CFrame = new CFrame(raycastResult.Position, raycastResult.Position.add(raycastResult.Normal))
        mindBlowing.CanCollide = false
        mindBlowing.Anchored = true
        mindBlowing.Name = "mindBlowing_pewPew"
        mindBlowing.Size = new Vector3(.4, .4, .4)
        mindBlowing.Color = Color3.fromRGB(59, 133, 245)
        mindBlowing.Material = Enum.Material.Neon
        mindBlowing.Shape = Enum.PartType.Ball
        mindBlowing.Parent = FX

        tween(mindBlowing, new TweenInfo(), {
            Size: new Vector3(4, 4, 4),
            Transparency: 1
        }).andThen(() => mindBlowing.Destroy())

        detect()
    }
}

export function categoryEquipped(player: Player): "primary" | "secondary" | undefined {
    const stats = player.WaitForChild("stats")
    const primary = stats.WaitForChild("primary") as StringValue
    const secondary = stats.WaitForChild("secondary") as StringValue
    const currentlyEquipped = stats.WaitForChild("currentlyEquipped") as StringValue
    if (!currentlyEquipped || !secondary || !primary) {return}
    if (currentlyEquipped.Value === primary.Value) {
        return "primary"
    } else if (currentlyEquipped.Value === secondary.Value) {
        return "secondary"
    }
    return undefined
}
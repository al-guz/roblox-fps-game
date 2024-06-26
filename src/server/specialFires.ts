import FastCast from "@rbxts/fastcast";
import { Promise } from "@rbxts/knit";
import { Debris, ServerStorage, Workspace } from "@rbxts/services";
import { detect } from "./hitbox";
import { GetService } from "@rbxts/knit/Knit/KnitServer";

const assets = ServerStorage.WaitForChild("assets")
const specialWeaponAssets = assets.WaitForChild("specialWeapons")
const iceAssets = specialWeaponAssets.WaitForChild("ice") as Folder
const FX = Workspace.WaitForChild("FX") as Folder

const combat = GetService("combat")

// FastCast.VisualizeCasts = true

export async function ice(player: Player, mousePosition: Vector3) {
    const character = player.Character
    const humanoid = character?.WaitForChild("Humanoid") as Humanoid
    const leftgrip = character?.WaitForChild("Left Arm")?.WaitForChild("LeftGripAttachment") as Attachment
    if (!character || !humanoid || !leftgrip) {return}

    const snowball = iceAssets.WaitForChild("snowball")
    
    const rp = new RaycastParams()
    rp.FilterDescendantsInstances = [character]
    rp.FilterType = Enum.RaycastFilterType.Exclude

    const disableProj = async <T extends typeof snowball>(snobol: T) : Promise<T> => {
        const snowProjAtt = snobol.WaitForChild("projectile")
        Promise.each(snowProjAtt.GetChildren(), (instance => {
            if (instance.IsA("ParticleEmitter")) {
                instance.Enabled = false
            }
        })).await()
        return Promise.resolve(snobol)
    }

    const boomdetect = async <T extends typeof snowball, U extends RaycastResult>(snowball: T, results: U) : Promise<void> => {
        const op = new OverlapParams()
        op.FilterDescendantsInstances = [character, FX]
        op.FilterType = Enum.RaycastFilterType.Exclude

        detect(new CFrame(results.Position), new Vector3(7.5, 7.5, 7.5), undefined, (character, humanoid) => {
            if (character && humanoid) {
                
            }
        })
    }

    const origin = leftgrip.WorldPosition
    
    const cast = new FastCast()
    const castBleh = FastCast.newBehavior()
    castBleh.CosmeticBulletTemplate = snowball
    castBleh.AutoIgnoreContainer = true
    castBleh.CosmeticBulletContainer = FX
    castBleh.Acceleration = new Vector3(0, -Workspace.Gravity, 0)
    castBleh.MaxDistance = 500
    castBleh.RaycastParams = rp

    const dir = (mousePosition.sub(origin)).Unit
    cast.LengthChanged.Connect((cast, lastpos, dir, _, vel, instance) => {
        const distanceCovered = cast.StateInfo.DistanceCovered
        if (instance?.IsA("BasePart")) {
            instance.CFrame = new CFrame(dir.add(lastpos), vel)
            if (distanceCovered >= 490) {
                instance.Destroy()
            }
        }
    })
    
    cast.RayHit.Connect((cast, result, _, instance) => {
        if (!instance) {return}

        disableProj(instance).andThen((t: Instance) => {
            const boom = t.WaitForChild("boom")
            for (const k of boom.GetChildren() as Array<ParticleEmitter>) {
                const emitCount = k.GetAttribute("emit") as number | undefined
                if (emitCount) {
                    k.Emit(emitCount)
                }
            }
            Debris.AddItem(t, 4)
        })
    })

    cast.Fire(new CFrame(origin).Position, dir, 250, castBleh)
}
// fps viewmodel component

import { Component, Janitor } from "@rbxts/knit";
import { GetController } from "@rbxts/knit/Knit/KnitClient";
import { Players, ReplicatedStorage, RunService, UserInputService, Workspace as workspace } from "@rbxts/services";
import Spring from "@rbxts/spring";
import { NetworkEvent, NetworkFunction } from "@rbxts/ts-remote";
import { fireRequest, fireRequestComponent, getClientCFrame, mobilityRequest, switchWeaponRequest } from "shared/remotes";
import { findSFX, enumToString } from "client/footstepSounds";

const getbobble = (n: number) => {
    return math.sin(tick() * n * 1.3) * .5
}

class fps implements Component.ComponentClass {
    public static Tag = "viewmodel";
    public janitor = new Janitor;
    public player : Player | undefined = undefined;
    public camera = workspace.CurrentCamera
    // spring stuff
    public swaySpring = new Spring(Vector3.zero)
    public bobbleSpring = new Spring(Vector3.zero, 15, undefined, .6)
    // random stuff
    public humanoidRootPart : Part | undefined
    public character : Model | undefined
    public viewModel : Model | undefined
    public equippedRn : string | undefined
    public idleAnimation  : AnimationTrack | undefined
    public animationTracks : AnimationTrack[] = []
    public humanoid : Humanoid | undefined
    //remote events
    public fireRequest = new NetworkEvent<fireRequest>("fireRequest")
    public fireComponentRequest = new NetworkEvent<fireRequestComponent>("fireRequestComponent")
    public mobilityRequest = new NetworkEvent<mobilityRequest>("mobilityRequest")
    public getClientCFrame = new NetworkFunction<getClientCFrame>("getClientCFrame")
    public switchWeaponRequest = new NetworkEvent<switchWeaponRequest>("switchWeaponRequest")
    // controllers
    public mouseController = GetController("mouse")
    // stats
    public special : StringValue | undefined
    public specialDebounce : BoolValue | undefined
    //random bs
    public canDoubleJump = false
    public hasDoubleJump = false
    
    constructor(instance: Model) {
        if (!instance.IsA("Model")) {return}
        this.player = Players.GetPlayerFromCharacter(instance)
        this.character = instance
        this.humanoid = instance.WaitForChild("Humanoid") as Humanoid
        const viewmodel = this.createViewmodel()
        this.janitor.LinkToInstance(instance, false)
        const stats = this.player?.WaitForChild("stats")
        const debounces = this.player?.WaitForChild("debounces")
        const currentlyEquipped = stats?.WaitForChild("currentlyEquipped") as StringValue
        this.special = stats?.WaitForChild("special") as StringValue
        this.specialDebounce = debounces?.WaitForChild("special") as BoolValue
        // if (this.player) {this.player.CameraMaxZoomDistance = 0.5}
        const humanoidRootPart = instance.WaitForChild("HumanoidRootPart") as Part
        if (humanoidRootPart) {
            humanoidRootPart.WaitForChild("Running")?.Destroy()
            this.humanoidRootPart = humanoidRootPart
        }
        //! remote function(s) clientInvoke events
        this.getClientCFrame.onClientInvoke = function(instanceName: string) {
            const descendants = instance.GetDescendants()
            let results : CFrame | undefined = undefined
            Promise.each(descendants, (instance) => {
                if (instance.Name === instanceName) {
                    if (instance.IsA("Attachment")) {
                        results = instance.WorldCFrame
                    } else if (instance.IsA("BasePart")) {
                        results = instance.CFrame
                    }
                }
            }).await()
            return results
        }
        //! viewmodel setup
        if (viewmodel) {
            this.viewModel = viewmodel
            this.janitor.Add(() => {
                this.idleAnimation?.Stop(0)
                this.idleAnimation?.Destroy()
                this.animationTracks.forEach((track, position) => {
                    track.Stop(0)
                    track.Destroy()
                    this.animationTracks.remove(position)
                })
            })
            if (currentlyEquipped) {
                this.equippedRn = currentlyEquipped.Value
                this.janitor.Add(currentlyEquipped.GetPropertyChangedSignal("Value").Connect(() => {
                    this.equippedRn = currentlyEquipped.Value
                    this.switchWeapon(this.equippedRn)
                }), "Disconnect", "OnWeaponChanged")
            }
            if (!this.equippedRn) {print("fat");return}
            this.switchWeapon(this.equippedRn)
        }
        this.janitor.Add(() => {
            if (this.player) {this.player.CameraMaxZoomDistance = 24}
            this.getClientCFrame.onClientInvoke = () => undefined
        })
        this.janitor.Add(this.humanoid.StateChanged.Connect((oState, nState) => {
            if (nState === Enum.HumanoidStateType.Freefall) {
                this.canDoubleJump = true
            }
            if (nState === Enum.HumanoidStateType.Landed) {
                this.canDoubleJump = false
                this.hasDoubleJump = false
            }
        }))
    }
    
    createViewmodel() : Model | undefined {
        if (!this.camera || this.viewModel) {return undefined}
        let viewmodel = ReplicatedStorage.FindFirstChild("viewmodel") as Model
        if (!viewmodel) {return undefined}
        viewmodel = this.janitor.Add(viewmodel.Clone(), "Destroy", "Viewmodel")
        viewmodel.Parent = this.camera
        const shirt = viewmodel.WaitForChild("Shirt") as Shirt
        const hasShirt = this.character?.WaitForChild("Shirt") as Shirt
        const charactersBodyColors = this.character?.WaitForChild("Body Colors") as BodyColors
        const playersBodyColors = viewmodel.WaitForChild("Body Colors") as BodyColors
        
        if (hasShirt){
            shirt.ShirtTemplate = hasShirt.ShirtTemplate
        }

        playersBodyColors.LeftArmColor3 = charactersBodyColors.LeftArmColor3
        playersBodyColors.RightArmColor3 = charactersBodyColors.RightArmColor3
        
        const viewmodelDescendants = viewmodel.GetDescendants()
        // footstep sfx!!
        const sfx = new Instance("Sound")
        sfx.Name = "footstep_sfx"
        sfx.Playing = true
        sfx.Volume = 0
        sfx.Looped = true
        sfx.Parent = this.humanoidRootPart
        
        // connecting events
        
        //render stepped
        this.janitor.Add(RunService.RenderStepped.Connect((dt) => {
            const velocity = this.getCharacterVelocity()
            const mouseDelta = UserInputService.GetMouseDelta()

            const bobble = new Vector3(getbobble(7), getbobble(5), getbobble(5))

            this.swaySpring.goal = new Vector3(-mouseDelta.X/475, mouseDelta.Y/200, 0)
            if (velocity){this.bobbleSpring.goal = bobble.div(10).mul(velocity.Magnitude).div(15)}

            if (this.camera) {
                const updatedSwaySpring = this.swaySpring.update(dt)
                const updatedBobbleSpring = this.bobbleSpring.update(dt)

                const swaySpringCFrame = new CFrame(updatedSwaySpring)
                const bobbleSpringCFrame = new CFrame(updatedBobbleSpring).ToWorldSpace(CFrame.Angles(
                    math.rad(updatedBobbleSpring.X/2),
                    math.rad(updatedBobbleSpring.Y),
                    math.rad(updatedBobbleSpring.Z)
                ))
                
                viewmodel.PivotTo(this.camera.CFrame.mul(swaySpringCFrame).mul(bobbleSpringCFrame))
            }

            if (this.humanoid) {
                if (this.humanoid.MoveDirection.Magnitude > 0) {
                    const materialString = enumToString(this.humanoid.FloorMaterial)
                    if (materialString !== "Air") {
                        const find = findSFX(materialString)
                        if (find) {
                            sfx.Volume = .4
                            sfx.PlaybackSpeed = (this.humanoid.WalkSpeed/25)
                            sfx.SoundId = find
                            sfx.Parent = this.humanoidRootPart
                        } else {
                            sfx.Volume = 0
                        }
                    } else if (materialString === "Air"){
                        sfx.Volume = 0
                    }
                } else {
                    sfx.Volume = 0
                }
            }
        }), "Disconnect", "RenderSteppedViewmodel")

        //input (firing, switching weapons, and mobility)
        this.janitor.Add(UserInputService.InputBegan.Connect((input, gameProcessed) => {
            if (gameProcessed) {return}
            const userinputtype = input.UserInputType
            const keycode = input.KeyCode
            if (userinputtype === Enum.UserInputType.MouseButton1) {
                const unitRay = this.mouseController.getUnitRay()
                if (!unitRay) {return}
                this.fireRequest.fireServer(unitRay)
            }
            if (keycode === Enum.KeyCode.Q) {
                this.mobilityRequest.fireServer("dash")
            // switching weapons (expect special, it uses on left arm)
            } else if (keycode === Enum.KeyCode.One) { // primary
                this.switchWeaponRequest.fireServer("primary")
                this.stopAnimation("fire")
            } else if (keycode === Enum.KeyCode.Two) { // secondary
                this.switchWeaponRequest.fireServer("secondary")
                this.stopAnimation("fire")
            } else if (keycode === Enum.KeyCode.G) { //! special use (DOESNT switch!)
                if (this.specialDebounce?.Value) {return}
                
                this.playAnimation("fire", true, Enum.AnimationPriority.Action2)
            } else if (keycode === Enum.KeyCode.Space) {
                if (this.canDoubleJump && !this.hasDoubleJump) {
                    const velocity = this.getCharacterVelocity()
                    if (!velocity || !this.humanoidRootPart) {return}
                    if (!this.humanoid) {return}
                    const velocity_ = velocity.mul(this.humanoid.MoveDirection.mul(2)).Unit
                    this.humanoidRootPart.ApplyImpulse(velocity_.mul(this.humanoidRootPart.GetMass()*2))
                    this.hasDoubleJump = true
                    this.humanoid?.ChangeState(Enum.HumanoidStateType.Jumping)
                }
            }
        }))
        
        this.janitor.Add(this.fireRequest.onClientEvent.Connect(() => {
            this.fireComponentRequest.fireServer()
            this.playAnimation("fire", false)?.andThen(() => {
                if (this.equippedRn?.lower() !== "lasergun") {return}
                this.playAnimation("reload", false, Enum.AnimationPriority.Action2)
            })
        }))
        
        viewmodelDescendants.forEach((v) => {
                if (v.IsA("BasePart")) {
                    v.CollisionGroup = "Viewmodel"
                }
        })

        return viewmodel
    }

    getAnimationOfWeapon(weaponName: string) : Folder | undefined {
        if (!this.viewModel) {return undefined}
        const weaponAnimations = this.viewModel.WaitForChild("weaponAnimations") as Folder
        return weaponAnimations?.FindFirstChild(weaponName) as Folder | undefined
    }

    getViewmodelAnimator() : Animator | undefined {
        if (!this.viewModel) {return undefined}
        const humanoid = this.viewModel?.FindFirstChild("Humanoid")
        return humanoid?.FindFirstChild("Animator") as Animator | undefined
    }

    setIdleAnim() {
        const animator = this.getViewmodelAnimator()
        if (!animator || !this.equippedRn) {print("returned nig");return}
        const weaponsAnims = this.getAnimationOfWeapon(this.equippedRn)
        if (!weaponsAnims) {print(`weapon anims of ${this.equippedRn} not found`);return}
        if (this.idleAnimation) {
            this.idleAnimation.Stop(0)
            this.idleAnimation = undefined
        }
        const weaponIdle = weaponsAnims.WaitForChild("idle") as Animation
        if (!weaponIdle) {return}
        const weaponIdleTrack = animator.LoadAnimation(weaponIdle)
        weaponIdleTrack.Play(0)
        this.idleAnimation = weaponIdleTrack
    }

    getCharacterVelocity() : Vector3 | undefined {
        if (!this.character) {return undefined}
        if (!this.humanoidRootPart) {return undefined}
        return this.humanoidRootPart.GetVelocityAtPosition(this.humanoidRootPart.Position)
    }

    playAnimation(animationName: string, isSpecial : boolean, animationPriority?: Enum.AnimationPriority) : Promise<number> | undefined {
        animationName = animationName.lower()
        if (animationName === "idle") {return}
        if (!this.equippedRn) {return}
        let animationFolder : Folder | undefined
        if (isSpecial) {
            const [d, res] = this.getSpecialFolder()
            if (res) {animationFolder = res}
        } else {
            animationFolder = this.getAnimationOfWeapon(this.equippedRn)
        }
        if (!animationFolder) {print("no found D:");return}
        const animation = animationFolder.FindFirstChild(animationName) as Animation
        const animator = this.getViewmodelAnimator()
        if (!animator || !animation) {print("not found chat");return}
        const [isInAnimationTracks, position] = this.isInAnimationTracks(animationName)
        if (isInAnimationTracks && position) {
            this.animationTracks.remove(position)
        }
        const track = animator.LoadAnimation(animation)
        track.Priority = animationPriority || Enum.AnimationPriority.Action
        track.Play(0)
        this.animationTracks.insert(this.animationTracks.size(), track)
        this.janitor.Add(track.KeyframeReached.Connect((keyName) => {
            keyName = keyName.lower()
            if (keyName === "gearsfx") {
                const [special, _] = this.getSpecialFolder()
                if (!special) {return}
                const gearSwitch = special.WaitForChild("GearRotating") as Sound
                gearSwitch.Play()
            }
            if (keyName === "fire") {
                const unitRay = this.mouseController.getUnitRay()
                if (!unitRay) {return}
                this.switchWeaponRequest.fireServer("special", unitRay as any)
            }
        }), "Disconnect", animationName)
        return Promise.delay(track.Length)
    }

    stopAnimation(name: string) {
        const [animation] = this.isInAnimationTracks(name)
        if (!animation) {return}
        animation.Stop(0)
    }

    isInAnimationTracks(animationName: string) : [anim?: AnimationTrack, pos?: number] {
        animationName = animationName.lower()
        let results : AnimationTrack | undefined = undefined
        let position : undefined | number = undefined

        Promise.each(this.animationTracks, (track, index) => {
            if (track.Name.lower() === animationName) {
                results = track
                position = index
            }
        }).await()
        return [results, position]
    }

    switchWeapon(weaponName: string) { 
        assert(this.viewModel, "no viewmodel has been found")
        weaponName = weaponName.lower()
        const weaponsFolder = this.viewModel.WaitForChild("weapons")
        weaponsFolder.GetChildren().forEach((instance) => {
            if (instance.IsA("BasePart")) {
                if (instance.Name.lower() === weaponName) {
                    instance.Transparency = 0
                } else {
                    instance.Transparency = 1
                }
            }
        })
        this.setIdleAnim()
    }

    //! function yields
    findInstance<T extends Instance>(instanceName: string, checkIn: Instance, deep: boolean) : T | undefined {
        if (!this.viewModel) {return}
        let result : T | undefined

        let goingDeep = deep ? checkIn.GetDescendants() : checkIn.GetChildren()

        Promise.each(goingDeep,(instance: T | Instance) => {
            if (instance.Name.lower() === instanceName.lower()) {
                result = instance as T
            }
        }).await()
        
        return result
    }

    getSpecialFolder() : [Folder?, Folder?] {
        assert(this.viewModel, "no viewmodel found")
        assert(this.special, "special string value not found in player")
        const specials = this.viewModel.WaitForChild("specials")
        const special = specials.FindFirstChild(this.special.Value.lower()) as Folder
        const specialAnimations = this.viewModel.WaitForChild("specialAnimations")
        const specialAnimations_ = specialAnimations.FindFirstChild(this.special.Value.lower()) as Folder
        if (special && specialAnimations_) {
            return [special, specialAnimations_]
        } else {return [undefined, undefined]}
    }

    public Destroy() {
        this.janitor.Cleanup()
    }
}

export = fps;
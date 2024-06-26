import { Workspace } from "@rbxts/services"

export function detect(position: CFrame, size: Vector3, op: OverlapParams | undefined, callback : (character?: Model, humanoid?: Humanoid) => void) {
    if (!op) {
        op = new OverlapParams()
        op.FilterDescendantsInstances = [Workspace.WaitForChild("FX")]
        op.FilterType = Enum.RaycastFilterType.Exclude
    }
    const results = Workspace.GetPartBoundsInBox(position, size, op)
    results.forEach((part) => {
        const parent = part?.FindFirstAncestorOfClass("Model") as Model
        const humanoid = parent?.FindFirstChildOfClass("Humanoid") as Humanoid
        if (parent && humanoid) {
            coroutine.wrap(callback)(parent, humanoid)
        } else {
            coroutine.wrap(callback)()
        }
    })
}
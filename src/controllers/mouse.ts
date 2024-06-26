import { KnitClient as Knit } from "@rbxts/knit";
import { UserInputService, Workspace } from "@rbxts/services";

declare global {
    interface KnitControllers {
        mouse: typeof mouse;
    }
}

const mouse = Knit.CreateController({
    Name: "mouse",

    getUnitRay() : Ray | undefined {
        const camera = Workspace.CurrentCamera
        const mouseLocation = this.getMousePosition()
        return camera?.ViewportPointToRay(mouseLocation.X, mouseLocation.Y)
    },

    getMousePosition() : Vector2 {
        return UserInputService.GetMouseLocation()
    },

    KnitInit() {
    },

    KnitStart() {
    },
});

export = mouse;
import { FunctionParams, NetworkFunction, NetworkFunctionConstructor } from "@rbxts/ts-remote/typings/NetworkFunction";

export interface fireRequest {
    onServerEvent: (unitRay: Ray) => void;
    onClientEvent: (reload: boolean) => void;
}

export interface fireRequestComponent {
    onServerEvent: () => void;
    onClientEvent: () => void;
}

export interface mobilityRequest {
    onServerEvent: (mobilityType : "dash") => void;
    onClientEvent: () => void;
}

export interface getClientCFrame {
    onClientInvoke: (instanceName: string) => CFrame | undefined
    onServerInvoke: () => void
}

export interface switchWeaponRequest {
    onClientEvent: () => void;
    onServerEvent: (category: "primary" | "secondary" | "special", unitRay?: Ray) => void
}
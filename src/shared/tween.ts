import { TweenService } from "@rbxts/services";

export function tween<T>(object: T, tweenInfo: TweenInfo, properties: Partial<ExtractMembers<T, Tweenable>>) : Promise<undefined> {
    return new Promise((resolve, _, onCancel) => {
        const tween = TweenService.Create(object as any, tweenInfo, properties)
        
        tween.Play()

        onCancel(() => {
            tween.Pause()
            tween.Destroy()
        })
        
        tween.Completed.Wait()

        resolve(undefined)
    })
}
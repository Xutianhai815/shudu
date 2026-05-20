import router from '@ohos.router';

@Entry
@Component
struct GamePage {
  build() {
    Column({ space: 18 }) {
      Text('数独盘准备中')
        .fontSize(30)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2B2118')

      Text('下一步会接入原生数独盘、数字输入和草稿模式。')
        .fontSize(16)
        .fontColor('#776857')
        .textAlign(TextAlign.Center)

      Button('返回')
        .width('84%')
        .height(52)
        .fontSize(17)
        .fontColor('#7A4E2D')
        .backgroundColor('#E8D8BF')
        .borderRadius(20)
        .onClick(() => {
          router.back();
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .padding({ left: 24, right: 24 })
    .backgroundColor('#F7F0E4')
  }
}

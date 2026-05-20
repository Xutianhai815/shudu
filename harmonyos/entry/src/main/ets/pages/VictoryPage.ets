import router from '@ohos.router';

@Entry
@Component
struct VictoryPage {
  build() {
    Column({ space: 18 }) {
      Text('这一局，大脑除锈完成')
        .fontSize(28)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2B2118')
        .textAlign(TextAlign.Center)

      Text('完成反馈页会在玩法流程接入后显示真实统计。')
        .fontSize(16)
        .fontColor('#776857')
        .textAlign(TextAlign.Center)

      Button('回到首页')
        .width('84%')
        .height(52)
        .fontSize(17)
        .fontColor('#FFF9EF')
        .backgroundColor('#7A4E2D')
        .borderRadius(20)
        .onClick(() => {
          router.replaceUrl({ url: 'pages/Index' });
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .padding({ left: 24, right: 24 })
    .backgroundColor('#F7F0E4')
  }
}

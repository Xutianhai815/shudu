import router from '@ohos.router';
import { CompletionFeedback, createCompletionFeedback } from '../game/feedback';

@Entry
@Component
struct VictoryPage {
  private feedback: CompletionFeedback = createCompletionFeedback(1, 1);

  build() {
    Column() {
      Blank()

      Text(this.feedback.title)
        .fontSize(30)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2B2118')
        .textAlign(TextAlign.Center)

      Text(this.feedback.subtitle)
        .margin({ top: 12 })
        .fontSize(16)
        .fontColor('#776857')
        .textAlign(TextAlign.Center)

      Column({ space: 10 }) {
        Text(this.feedback.primaryStat)
          .fontSize(24)
          .fontWeight(FontWeight.Bold)
          .fontColor('#7A4E2D')
          .textAlign(TextAlign.Center)

        Text(this.feedback.secondaryStat)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor('#776857')
          .textAlign(TextAlign.Center)
      }
      .margin({ top: 34 })
      .width('100%')
      .padding({ left: 24, right: 24, top: 24, bottom: 24 })
      .backgroundColor('#FFF9EF')
      .borderRadius(24)
      .shadow({
        radius: 18,
        color: '#22000000',
        offsetX: 0,
        offsetY: 8,
      })

      Column({ space: 14 }) {
        Button('再来一局')
          .width('100%')
          .height(52)
          .fontSize(17)
          .fontWeight(FontWeight.Medium)
          .fontColor('#FFF9EF')
          .backgroundColor('#7A4E2D')
          .borderRadius(20)
          .onClick(() => {
            router.replaceUrl({ url: 'pages/GamePage', params: { mode: 'campaign' } });
          })

        Button('回到首页')
          .width('100%')
          .height(52)
          .fontSize(17)
          .fontWeight(FontWeight.Medium)
          .fontColor('#7A4E2D')
          .backgroundColor('#E8D8BF')
          .borderRadius(20)
          .onClick(() => {
            router.replaceUrl({ url: 'pages/Index' });
          })
      }
      .margin({ top: 34 })
      .width('100%')

      Blank()
    }
    .width('100%')
    .height('100%')
    .padding({ left: 28, right: 28, top: 56, bottom: 36 })
    .backgroundColor('#F7F0E4')
  }
}

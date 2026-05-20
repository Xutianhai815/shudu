import router from '@ohos.router';
import { TrainingOption, trainingOptions } from '../game/modes';

@Entry
@Component
struct PracticePage {
  private openPracticeGame(option: TrainingOption): void {
    router.pushUrl({
      url: 'pages/GamePage',
      params: {
        mode: 'practice',
        trainingDifficulty: option.trainingDifficulty
      }
    });
  }

  build() {
    Column() {
      Blank()
        .height(72)

      Text('自由练习')
        .fontSize(32)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2B2118')

      Text('选择今天想练的节奏。')
        .margin({ top: 10 })
        .fontSize(16)
        .fontColor('#776857')

      Column({ space: 14 }) {
        ForEach(trainingOptions, (option: TrainingOption) => {
          Button() {
            Column() {
              Text(option.label)
                .fontSize(20)
                .fontWeight(FontWeight.Bold)
                .fontColor('#2B2118')

              Text(option.description)
                .margin({ top: 4 })
                .fontSize(14)
                .fontColor('#776857')
            }
            .alignItems(HorizontalAlign.Start)
            .width('100%')
          }
          .width('100%')
          .height(76)
          .padding({ left: 20, right: 20 })
          .backgroundColor('#FFF9EF')
          .borderRadius(20)
          .onClick(() => {
            this.openPracticeGame(option);
          })
        }, (option: TrainingOption) => option.trainingDifficulty)
      }
      .margin({ top: 36 })
      .width('100%')

      Button('返回首页')
        .margin({ top: 28 })
        .width('100%')
        .height(52)
        .fontSize(17)
        .fontWeight(FontWeight.Medium)
        .fontColor('#7A4E2D')
        .backgroundColor('#E8D8BF')
        .borderRadius(20)
        .onClick(() => {
          router.back();
        })

      Blank()
    }
    .width('100%')
    .height('100%')
    .padding({ left: 24, right: 24, bottom: 36 })
    .backgroundColor('#F7F0E4')
  }
}

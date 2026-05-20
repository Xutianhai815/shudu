import router from '@ohos.router';
import { TrainingOption, trainingOptions } from '../game/modes';
import {
  ACCENT_BROWN,
  MUTED_PANEL,
  PAGE_BACKGROUND,
  PAGE_BOTTOM_PADDING,
  PAGE_HORIZONTAL_PADDING,
  PAGE_TOP_PADDING,
  PRIMARY_TEXT,
  SECONDARY_TEXT,
  SOFT_PANEL,
} from '../ui/layout';

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
        .height(PAGE_TOP_PADDING)

      Text('自由练习')
        .fontSize(32)
        .fontWeight(FontWeight.Bold)
        .fontColor(PRIMARY_TEXT)

      Text('选择今天想练的节奏。')
        .margin({ top: 10 })
        .fontSize(16)
        .fontColor(SECONDARY_TEXT)

      Column({ space: 14 }) {
        ForEach(trainingOptions, (option: TrainingOption) => {
          Button() {
            Column() {
              Text(option.label)
                .fontSize(20)
                .fontWeight(FontWeight.Bold)
                .fontColor(PRIMARY_TEXT)

              Text(option.description)
                .margin({ top: 4 })
                .fontSize(14)
                .fontColor(SECONDARY_TEXT)
            }
            .alignItems(HorizontalAlign.Start)
            .width('100%')
          }
          .width('100%')
          .height(76)
          .padding({ left: 20, right: 20 })
          .backgroundColor(SOFT_PANEL)
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
        .fontColor(ACCENT_BROWN)
        .backgroundColor(MUTED_PANEL)
        .borderRadius(20)
        .onClick(() => {
          router.back();
        })

      Blank()
    }
    .width('100%')
    .height('100%')
    .padding({ left: PAGE_HORIZONTAL_PADDING, right: PAGE_HORIZONTAL_PADDING, bottom: PAGE_BOTTOM_PADDING })
    .backgroundColor(PAGE_BACKGROUND)
  }
}

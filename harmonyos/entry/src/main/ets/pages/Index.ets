import router from '@ohos.router';
import {
  ACCENT_BROWN,
  MUTED_PANEL,
  PAGE_BACKGROUND,
  PAGE_BOTTOM_PADDING,
  PAGE_HORIZONTAL_PADDING,
  PAGE_TOP_PADDING,
  PRIMARY_TEXT,
  SECONDARY_TEXT,
} from '../ui/layout';

@Entry
@Component
struct Index {
  private openCampaign(): void {
    router.pushUrl({
      url: 'pages/GamePage',
      params: {
        mode: 'campaign'
      }
    });
  }

  private openPractice(): void {
    router.pushUrl({
      url: 'pages/PracticePage'
    });
  }

  build() {
    Column() {
      Blank()
        .height(PAGE_TOP_PADDING)

      Text('数独实验室')
        .fontSize(36)
        .fontWeight(FontWeight.Bold)
        .fontColor(PRIMARY_TEXT)

      Text('每天一局，给大脑做一次轻量除锈。')
        .margin({ top: 12 })
        .fontSize(17)
        .fontColor(SECONDARY_TEXT)

      Column({ space: 16 }) {
        Button('闯关挑战')
          .width('100%')
          .height(60)
          .fontSize(19)
          .fontWeight(FontWeight.Medium)
          .fontColor('#FFF9EF')
          .backgroundColor(ACCENT_BROWN)
          .borderRadius(22)
          .onClick(() => {
            this.openCampaign();
          })

        Button('自由练习')
          .width('100%')
          .height(60)
          .fontSize(19)
          .fontWeight(FontWeight.Medium)
          .fontColor(PRIMARY_TEXT)
          .backgroundColor(MUTED_PANEL)
          .borderRadius(22)
          .onClick(() => {
            this.openPractice();
          })
      }
      .margin({ top: 56 })
      .width('100%')

      Blank()
    }
    .width('100%')
    .height('100%')
    .padding({ left: PAGE_HORIZONTAL_PADDING, right: PAGE_HORIZONTAL_PADDING, bottom: PAGE_BOTTOM_PADDING })
    .backgroundColor(PAGE_BACKGROUND)
  }
}

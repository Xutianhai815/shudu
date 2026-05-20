import router from '@ohos.router';

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
        .height(96)

      Text('数独实验室')
        .fontSize(34)
        .fontWeight(FontWeight.Bold)
        .fontColor('#2B2118')

      Text('每天一局，给大脑做一次轻量除锈。')
        .margin({ top: 12 })
        .fontSize(16)
        .fontColor('#776857')

      Column({ space: 16 }) {
        Button('闯关挑战')
          .width('100%')
          .height(56)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor('#FFF9EF')
          .backgroundColor('#7A4E2D')
          .borderRadius(22)
          .onClick(() => {
            this.openCampaign();
          })

        Button('自由练习')
          .width('100%')
          .height(56)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor('#2B2118')
          .backgroundColor('#E8D8BF')
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
    .padding({ left: 28, right: 28, bottom: 44 })
    .backgroundColor('#F7F0E4')
  }
}

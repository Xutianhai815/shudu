type SimpleHandler = () => void;

@Component
export struct ToolBar {
  @Prop noteMode: boolean;
  onToggleNoteMode: SimpleHandler = (): void => {};
  onClear: SimpleHandler = (): void => {};
  onRestart: SimpleHandler = (): void => {};

  private getNoteLabel(): string {
    return this.noteMode ? '草稿中' : '草稿模式';
  }

  private getNoteBackground(): string {
    return this.noteMode ? '#7A4E2D' : '#E8D8BF';
  }

  private getNoteColor(): string {
    return this.noteMode ? '#FFF9EF' : '#7A4E2D';
  }

  build() {
    Row({ space: 10 }) {
      Button(this.getNoteLabel())
        .layoutWeight(1)
        .height(44)
        .fontSize(15)
        .fontWeight(FontWeight.Medium)
        .fontColor(this.getNoteColor())
        .backgroundColor(this.getNoteBackground())
        .borderRadius(16)
        .onClick(() => {
          this.onToggleNoteMode();
        })

      Button('清除')
        .layoutWeight(1)
        .height(44)
        .fontSize(15)
        .fontWeight(FontWeight.Medium)
        .fontColor('#7A4E2D')
        .backgroundColor('#E8D8BF')
        .borderRadius(16)
        .onClick(() => {
          this.onClear();
        })

      Button('重新开始')
        .layoutWeight(1)
        .height(44)
        .fontSize(15)
        .fontWeight(FontWeight.Medium)
        .fontColor('#7A4E2D')
        .backgroundColor('#E8D8BF')
        .borderRadius(16)
        .onClick(() => {
          this.onRestart();
        })
    }
    .width('100%')
  }
}

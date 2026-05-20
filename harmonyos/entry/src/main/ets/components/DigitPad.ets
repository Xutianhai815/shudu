const DIGITS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type DigitHandler = (digit: number) => void;

@Component
export struct DigitPad {
  @Prop noteMode: boolean;
  onDigit: DigitHandler = (digit: number): void => {};

  private getDigitBackground(): string {
    return this.noteMode ? '#FFF5D9' : '#7A4E2D';
  }

  private getDigitColor(): string {
    return this.noteMode ? '#7A4E2D' : '#FFF9EF';
  }

  private getDigitBorderColor(): string {
    return this.noteMode ? '#D4A768' : '#7A4E2D';
  }

  build() {
    Row({ space: 8 }) {
      ForEach(DIGITS, (digit: number) => {
        Button() {
          Text(digit.toString())
            .fontSize(this.noteMode ? 18 : 22)
            .fontWeight(this.noteMode ? FontWeight.Medium : FontWeight.Bold)
            .fontColor(this.getDigitColor())
        }
          .layoutWeight(1)
          .height(52)
          .backgroundColor(this.getDigitBackground())
          .border({
            width: this.noteMode ? 1 : 0,
            color: this.getDigitBorderColor(),
          })
          .borderRadius(16)
          .onClick(() => {
            this.onDigit(digit);
          })
      }, (digit: number) => digit.toString())
    }
    .width('100%')
  }
}

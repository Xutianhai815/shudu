@Component
export struct FeedbackToast {
  @Prop message: string;

  build() {
    if (this.message.trim().length > 0) {
      Text(this.message)
        .maxLines(2)
        .fontSize(14)
        .fontWeight(FontWeight.Medium)
        .fontColor('#FFF9EF')
        .textAlign(TextAlign.Center)
        .padding({ left: 16, right: 16, top: 10, bottom: 10 })
        .backgroundColor('#7A4E2D')
        .borderRadius(18)
        .shadow({
          radius: 12,
          color: '#33000000',
          offsetX: 0,
          offsetY: 6,
        })
    }
  }
}

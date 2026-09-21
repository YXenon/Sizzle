<div align="center">

<img src="assets/banner.png" style="width:full" />

<h1>Sizzle: Youtube Comments Classifier</h1>
Sizzle is a tool and browser extension that automatically rates the quality of youtube comments and filters out unnecessary ones. Everything runs on your computer with very few resources.
</div>

### Install

- Google Chrome Webstore
- Mozilla Firefox Addons
- [Releases](https://github.com/YXenon/Sizzle/releases/latest)

### Objective

Studies show that spammers evolve faster than viruses. They can be corporate, clankers (bots), lil ipad kids, or your neighborhood cat 🐱.
These spam comments take up ~40% of the comments in videos which are for all ages.

I could not find any good way of removing these comments, which wastes my time, so I present to you Sizzle.

 ***Is this just another spam filter chrome extension ?***
> Nope! This tool adapts to evolving spammers automatically as it uses semantic analysis model, and gives every comment rating on its quality. Everything runs offline. You choose the quality of comments, whether you want them to be good, bad or in between.

***Is this tool fully perfect ?***
> No. It may remove some comments which it classes as low effort but you find them interesting. Don't worry, you can always reduce its strictness.

### Demo

<details>

<summary>Popup UI</summary>

![Popup UI](https://github.com/user-attachments/assets/fb26433b-7d7f-4e25-98d3-e27947565782)

</details>

<!-- <div align="center">

**Example usage**<br />

<https://github.com/user-attachments/assets/3c114058-c9a4-464e-9121-3001496447be>

</div> -->

## Installation

1. Go to the [latest release](https://github.com/YXenon/Sizzle/releases/latest).
2. If you're installing on **Chrome** (or chromium-based) browsers, download the `.crx` file. You will need to enable developer mode before you start using it, as its not available on Google Chrome Webstore yet.
3. If you're installing on **Firefox** (or firefox-based) browsers, download the `.xpi` file.
4. Drag and drop the file to the extensions page.
5. Download the files as prompted by the tab that just opened.
6. You can tweak with the threshold by opening the popup.

## Build & Train

If you want to build the extension, you can follow the [build guide](extension/README.md). If you intend to train the model weights, you can follow [training guide](trainer/README.md).

## License & Contributions

This project and weights are licensed under the [AGPL-3.0 License](LICENSE).

Contributions are very much welcome! Please fork the repository and submit a pull request with your changes, and I'll try to review, merge and publish promptly! 🤝

## Credits

- Embedding model: [Xenova/paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2)

- Pre-training LLM: [ibm-granite/granite-3.1-8b-instruct](https://huggingface.co/ibm-granite/granite-3.1-8b-instruct)

- Source of training data:
  
  1. [Kaggle - YouTube Trending Videos Stats 2026](https://www.kaggle.com/datasets/bsthere/youtube-trending-videos-stats-2026)
  2. [Huggingface - tskolm/youtube_top_popular_videos_comments](https://huggingface.co/datasets/tskolm/youtube_top_popular_videos_comments)
  3. [Huggigface - breadlicker45/youtube-comments](https://huggingface.co/datasets/breadlicker45/youtube-comments)

  Not all the data was used for entry, only best-picked ones were used.

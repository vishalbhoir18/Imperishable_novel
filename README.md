# IMPERISHABLE: the book's website

A one-page landing site with Apple-style scroll scenes. It is plain HTML, CSS and JavaScript, so there is nothing to install and no build step. GitHub Pages can host it for free.

## What's in this folder

| Path | What it is |
| --- | --- |
| `index.html` | The whole page |
| `assets/js/config.js` | **Your links**: the only file you need to edit |
| `assets/js/site.js` | The scroll engine (scenes, fades, counters) |
| `lab.html` | The Lens Lab: four interactive experiments on the science behind the novel |
| `assets/js/lab/` | The Lens Lab's code (lensing, the Sun as a telescope, old light) |
| `assets/vendor/` | three.js, the 3D library the Lens Lab uses (MIT licence, included so nothing loads from elsewhere) |
| `assets/css/site.css` | All the styling |
| `assets/seq/` | Frame-by-frame images for the three scroll scenes, with landscape (`l`) and phone (`p`) sets |
| `assets/img/` | Pictures, the book mockup, the social share image and the favicon |
| `assets/media/` | Trailer, plus the media-kit downloads (cover, banners, quote cards) |

The folder is about 16 MB, well within GitHub's limits.

## 1. Add your links

Open `assets/js/config.js` and paste your URLs between the quotes:

```js
kindle:    'https://www.amazon.com/dp/XXXXXXXXXX',
paperback: 'https://www.amazon.com/dp/YYYYYYYYYY',
freeStory: 'https://...your sign-up form for First Dark...',
youtube:   'https://www.youtube.com/@yourchannel',
instagram: 'https://www.instagram.com/yourhandle',
x:         'https://x.com/yourhandle',
linkedin:  'https://www.linkedin.com/in/yourprofile',
linktree:  'https://linktr.ee/yourname',
email:     'you@example.com',
```

- Buttons whose link is still `'#'` stay on the page but do nothing.
- The footer's **Stay in touch** block shows your Linktree, social profiles and email. Each handle (such as @yourhandle) is read from the profile link. Anything left empty (`''`) is hidden, and the whole block hides if all of them are empty.
- The email address is visible to anyone, including spam bots. A separate address for readers is a good idea.

## 2. Put it on GitHub Pages

The site has about 630 files, and GitHub's drag-and-drop uploader takes only 100 at a time, so use the free **GitHub Desktop** app (desktop.github.com):

1. In GitHub Desktop, choose **File → Add local repository**, pick this `website` folder, and accept the offer to **create a repository** there. Name it, for example, `imperishable`.
2. Type a summary such as "First version" and click **Commit to main**.
3. Click **Publish repository**, untick **Keep this code private**, and publish.
4. On github.com, open the new repository, so `index.html` should be at its top level.
5. Open **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, then branch **main** and folder **/ (root)**, and click **Save**.
6. Wait a minute or two. The site appears at `https://<your-username>.github.io/imperishable/`.

To update the site later, edit a file here, then in GitHub Desktop click **Commit to main** and **Push origin**. For a small change, such as a link in `config.js`, you can instead edit the file on github.com with the pencil icon. Pages republishes on its own within a minute or two.

The empty `.nojekyll` file tells GitHub to serve the files exactly as they are. Leave it in.

## 3. Fix the share preview (one line, after your address is known)

Facebook, X, LinkedIn and WhatsApp need the **full** address of the preview image. In `index.html`, replace the two lines

```html
<meta property="og:image" content="assets/img/og-image.jpg">
<meta name="twitter:image" content="assets/img/og-image.jpg">
```

with your real address, for example

```html
<meta property="og:image" content="https://<your-username>.github.io/imperishable/assets/img/og-image.jpg">
<meta name="twitter:image" content="https://<your-username>.github.io/imperishable/assets/img/og-image.jpg">
```

You can check the result with LinkedIn's Post Inspector or by pasting the link into a draft post.

## 4. Optional: your own domain

To use a domain such as `imperishablebook.com`:

1. Buy the domain from any registrar.
2. In **Settings → Pages → Custom domain**, enter it and save. GitHub adds a `CNAME` file for you.
3. At the registrar, point the domain at GitHub Pages with the DNS records listed in GitHub's "Managing a custom domain" guide.
4. Once it resolves, tick **Enforce HTTPS**, and update the share-image address from step 3 to the new domain.

## Preview it on your computer

The scroll scenes load images, so open the page through a small local server, not by double-clicking `index.html`:

```bash
py -m http.server 8090 --directory website
```

Then visit http://localhost:8090.

## Good to know

- **Phones** get their own portrait frames for the scroll scenes automatically.
- **Reduced motion:** visitors who have "reduce motion" turned on see every scene as a still image with its text, with no scrubbing.
- **Fonts:** the site uses EB Garamond from Google Fonts. The print book's Minion Pro is a commercial font and is not licensed for websites, so it is not included.
- **AI disclosure:** the trailer section says the narration uses an AI-generated voice and the visuals were rendered in Blender. Keep that line, and use the same wording on YouTube and Amazon.
- **The twist:** nothing on the page names the book's secret. Keep it that way in any copy you add, including the FAQ, the glossary and the book-club questions.

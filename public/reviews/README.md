# Review carousel images

Placeholder screenshots for the sticky "What parents say" carousel
(`src/components/ReviewCarousel.js`), used until Judge.me's paid
cross-platform plan is active.

To swap in real reviews:

1. Export/screenshot a few real reviews from Judge.me (the same ones shown
   on sn00zly.com).
2. Drop the image files in this folder (PNG or JPG, roughly 4:5 portrait
   crops read well in the sidebar).
3. Update the `REVIEW_IMAGES` array in `src/components/ReviewCarousel.js`
   with the new filenames — any number of images works, the carousel and
   its dots adjust automatically.
4. Delete the `placeholder-*.svg` files once they're no longer referenced.

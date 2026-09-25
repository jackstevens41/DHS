# DHS & Agencies News Widget

A news aggregator widget that displays headlines related to the Department of Homeland Security and its subagencies, with special highlighting for contracting and procurement news.

## Features

- Aggregates news from 9+ trusted sources (FedScoop, Nextgov, GovExec, etc.)
- Filters for DHS-related content (DHS, CISA, TSA, FEMA, ICE, CBP, USCG, USSS, USCIS, FLETC, CWMD)
- Highlights contract-related news with red badge
- Tags articles by agency
- Auto-refreshes every 15 minutes
- No API keys required
- No CORS issues (uses serverless backend)

## Deployment to Netlify

### Step 1: Install Netlify CLI (Optional)

You can deploy via the Netlify website OR use the CLI:

```bash
npm install -g netlify-cli
```

### Step 2: Deploy via Netlify Website (Easiest)

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Sign up or log in (can use GitHub account)
3. Click **"Add new site"** → **"Import an existing project"**
4. Choose **"Deploy manually"**
5. Drag and drop the entire `dhs-news-widget` folder
6. Netlify will automatically detect the `netlify.toml` configuration
7. Wait ~30 seconds for deployment
8. Your site will be live at: `https://random-name-123.netlify.app`

### Step 3: Get Your Widget URL

Your widget will be available at:
```
https://your-site-name.netlify.app/
```

You can customize the subdomain in Netlify's site settings.

## Using in SharePoint

### Method 1: Embed Web Part

1. Edit your SharePoint page
2. Add the **"Embed"** web part
3. Paste your Netlify URL
4. Resize as needed

### Method 2: IFrame

Add an HTML web part with:

```html
<iframe 
    src="https://your-site-name.netlify.app/" 
    width="100%" 
    height="800px" 
    frameborder="0"
    style="border: none;">
</iframe>
```

## Testing Locally

If you have Node.js installed, you can test locally:

```bash
cd dhs-news-widget
netlify dev
```

Open http://localhost:8888 in your browser.

## Customization

### Change Agencies

Edit `netlify/functions/fetch-news.js` - modify the `AGENCIES` array.

### Change RSS Feeds

Edit `netlify/functions/fetch-news.js` - modify the `RSS_FEEDS` array.

### Change Contract Keywords

Edit `netlify/functions/fetch-news.js` - modify the `CONTRACT_KEYWORDS` array.

### Styling

Edit `index.html` - modify the `<style>` section.

## Troubleshooting

**No articles showing:**
- Check Netlify function logs in the Netlify dashboard
- Some RSS feeds might be temporarily unavailable
- DHS news might not be in recent headlines

**Slow loading:**
- The serverless function fetches 9 RSS feeds sequentially (~5-10 seconds)
- This is normal on first load

**502 Bad Gateway:**
- Netlify function timeout (10 seconds max on free tier)
- Try removing some RSS feeds from the list

## File Structure

```
dhs-news-widget/
├── index.html                      # Frontend widget
├── netlify.toml                    # Netlify configuration
├── netlify/
│   └── functions/
│       └── fetch-news.js          # Serverless function
└── README.md                       # This file
```

## Cost

**Free!** Netlify's free tier includes:
- 100GB bandwidth/month
- 125K serverless function requests/month
- Automatic HTTPS

More than enough for a news widget refreshed every 15 minutes.

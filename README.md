# FB Phase-2 Scraper with Local Data Server

এই প্রজেক্ট Facebook group posts এবং comments scrape করে এবং সেগুলো `data/final.json` ফাইলে auto-save করে।

## 🚀 Setup Instructions

### 1. Dependencies Install করুন
```bash
npm install
```

### 2. Local Server Start করুন
```bash
npm start
```

Server `http://localhost:3000` এ run হবে এবং `data/final.json` ফাইল manage করবে।

### 3. Chrome Extension Load করুন
1. Chrome-এ `chrome://extensions/` যান
2. "Developer mode" enable করুন
3. "Load unpacked" ক্লিক করে এই folder select করুন
4. Extension reload করুন (refresh button)

## 📁 File Structure
```
├── data/
│   └── final.json          # Auto-updated data file
├── server/
│   └── server.js           # Local data server
├── background.js           # Extension background script
├── content.js             # Facebook page scraper
├── sidepanel.html         # Extension UI
├── sidepanel.js           # UI controls
├── manifest.json          # Extension manifest
└── package.json           # Node.js dependencies
```

## 🔧 How It Works

### Auto-Save System
- Extension scrape করার সময় data automatically `data/final.json`-এ save হয়
- Local server এর মাধ্যমে duplicate check করে data append হয়
- Real-time save: প্রতি post এবং 10 second interval-এ

### Manual Backup
- "Update final.json" button দিয়ে manually data copy করতে পারেন
- "Download Final" button দিয়ে download করতে পারেন

## 📊 API Endpoints

Server running থাকলে এই endpoints গুলো use করতে পারেন:

- `POST /append-data` - New data append করে
- `GET /get-data` - Current data দেখায়
- `POST /clear-data` - সব data clear করে
- `GET /health` - Server status check

## 🐛 Troubleshooting

### Server Not Running Error
```
❌ Failed to save to local server: Failed to fetch
💡 Make sure the local server is running: npm start
```

**Solution:** Terminal-এ `npm start` run করুন

### Extension Reload Required
Manifest change হলে extension reload করুন:
1. `chrome://extensions/` যান
2. Extension-এর refresh button ক্লিক করুন

### Data Not Saving
1. Console-এ error check করুন
2. Server running কিনা confirm করুন
3. `data/final.json` file exist কিনা check করুন

## 🎯 Usage

1. **Server Start:** `npm start`
2. **Extension Load:** Chrome-এ load করুন
3. **Phase-1 Upload:** `phase1.json` upload করুন
4. **Start Scraping:** Auto-save active হবে
5. **Monitor:** Console-এ progress দেখুন

Data automatically `data/final.json`-এ save হবে! ✅
4. **Monitor Progress**: Watch the live logs and progress indicators
5. **Control**: Use Pause/Resume/Stop as needed
6. **Download Results**: When complete, `final.json` will automatically download

## Data Structure

The output `final.json` contains an array of objects with this structure:

//comment count from post : `comet_sections.feedback.story.story_ufi_container.story.feedback_context.feedback_target_with_context.comet_ufi_summary_and_actions_renderer.feedback.comment_rendering_instance.comments.total_count`
// commment count alternative : `comet_sections.feedback.story.story_ufi_container.story.feedback_context.feedback_target_with_context.comet_ufi_summary_and_actions_renderer.feedback.comments_count_summary_renderer.feedback.comment_rendering_instance.comments.total_count`
//timestamp
{
    "bumpers": null,
    "tracking": "{\"top_level_post_id\":\"1972504293646858\",\"content_owner_id_new\":\"100047167200721\",\"photo_attachments_list\":[\"1372334451015449\",\"1372334774348750\",\"1372334944348733\",\"1372334564348771\",\"1372334667682094\"],\"photo_id\":\"1372334451015449\",\"story_location\":9,\"story_attachment_style\":\"album\",\"ent_attachement_type\":\"PhotoSetAttachment\",\"page_insights\":{\"571527207077914\":{\"page_id\":\"571527207077914\",\"page_id_type\":\"group\",\"actor_id\":\"100047167200721\",\"dm\":{\"isShare\":0,\"originalPostOwnerID\":0,\"sharedMediaID\":0,\"sharedMediaOwnerID\":0},\"psn\":\"EntGroupMallPostCreationStory\",\"post_context\":{\"object_fbtype\":657,\"publish_time\":1764002902,\"story_name\":\"EntGroupMallPostCreationStory\",\"story_fbid\":[\"1972504293646858\"]},\"role\":1,\"sl\":9}},\"actrs\":\"100047167200721\",\"tds_flgs\":3}",
    "id": "UzpfSTEwMDA0NzE2NzIwMDcyMTpWSzoxOTcyNTA0MjkzNjQ2ODU4"
}

```json
[
  {
    "post": {
      "url": "Post URL",
      "id": "post_id",
      "author": "Author Name",
      "author_url": "author_url", //facebook url
      "text": "Post content...",
      "comment_count": "comet_sections.feedback.story.story_ufi_container.story.feedback_context.feedback_target_with_context.comet_ufi_summary_and_actions_renderer.feedback.comment_rendering_instance.comments.total_count",
      "reaction_count": "comet_sections.feedback.story.story_ufi_container.story.feedback_context.feedback_target_with_context.comet_ufi_summary_and_actions_renderer.feedback.i18n_reaction_count",
      "share_count": "comet_sections.feedback.story.story_ufi_container.story.feedback_context.feedback_target_with_context.comet_ufi_summary_and_actions_renderer.feedback.i18n_share_count",
      "Date and time": "comet_sections.context_layout.story.comet_sections.metadata[2].story.creation_time", // if available
      "Date and time alternative": "comet_sections.timestamp.story.creation_time", // if available    
      "timestamp": "comet_sections.timestamp.story.creation_time",
      "timestamp_readable": "12/31/2023, 12:00:00 PM",
      "attachments": [
        {
          "source_type": "attachments[0].media.__typename",
          "Count": "attachments[0].styles.attachment.all_subattachments.count",
          "url": "attachments[0].styles.attachment.url",
        },
        {
          "source_type": "attachments[0].styles.attachment.source.text",
          "url": "attachments[0].styles.attachment.url",
        },
        {
          "ExternalWebLink": "attachments[0].styles.attachment.story_attachment_link_renderer.attachment.web_link.url",
        }
      ] // if available
    },
    "comments": [
      {
        "comment_url": "[0].post.extracted_raw_comments[0].comment_action_links[0].comment.url",
        "author": "[0].post.extracted_raw_comments[0].author.name",
        "author_id": "[0].post.extracted_raw_comments[0].author.id",
        "author_url": "[0].post.extracted_raw_comments[0].author.url",
        "text": "[0].post.extracted_raw_comments[0].body.text", //
        "Date and time": "[0].post.extracted_raw_comments[0].created_time", // convert with radable date
        "timestamp_readable": "[0].post.extracted_raw_comments[0].created_time",
        "replies": [
          {
            "comment_url": "[0].post.extracted_raw_comments[0].comment_action_links[0].comment.url",
        "author": "[0].post.extracted_raw_comments[0].author.name",
        "author_id": "[0].post.extracted_raw_comments[0].author.id",
        "author_url": "[0].post.extracted_raw_comments[0].author.url",
        "text": "[0].post.extracted_raw_comments[0].body.text", //
        "Date and time": "[0].post.extracted_raw_comments[0].created_time", // convert with radable date
        "timestamp_readable": "[0].post.extracted_raw_comments[0].created_time",
        "replies": [
          "comment_url": "[0].post.extracted_raw_comments[0].comment_action_links[0].comment.url",
        "author": "[0].post.extracted_raw_comments[0].author.name",
        "author_id": "[0].post.extracted_raw_comments[0].author.id",
        "author_url": "[0].post.extracted_raw_comments[0].author.url",
        "text": "[0].post.extracted_raw_comments[0].body.text", //
        "Date and time": "[0].post.extracted_raw_comments[0].created_time", // convert with radable date
        "timestamp_readable": "[0].post.extracted_raw_comments[0].created_time",
        "replies": []
        ]
          }
        ]
      }
    ],
  
  }
]
```

## Technical Details

- **Network Interception**: Uses XMLHttpRequest and fetch overrides to capture GraphQL responses
- **Data Extraction**: Walks JSON response objects to find post and comment data
- **State Management**: Uses chrome.storage.local for persistence
- **Error Handling**: Includes retry logic and error counting
- **Performance**: Processes one post at a time to avoid rate limiting

## Troubleshooting

- **Extension not loading**: Ensure all files are in the correct structure
- **No data captured**: Check that you're logged into Facebook and have access to the posts
- **Side panel not opening**: Try right-clicking the extension icon
- **Errors in logs**: Check the browser console for detailed error messages

## Security & Privacy

- Only accesses facebook.com pages as specified in manifest
- Does not send data to external servers
- All data processing happens locally in the browser
- Respects Facebook's terms of service (use at your own risk)

## Development

To modify the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click "Reload" on the extension
4. Test your changes

## License

This project is for educational purposes. Use responsibly and in accordance with Facebook's terms of service.
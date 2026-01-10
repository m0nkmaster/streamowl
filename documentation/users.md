# User Documentation

This guide helps users understand how to use Stream Owl to discover, track, and
organise their favourite movies and TV shows.

## Table of Contents

- [Getting Started](#getting-started)
- [Features](#features)
- [How to Use](#how-to-use)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Creating an Account

1. Navigate to the Stream Owl homepage
2. Click "Get Started" or "Sign Up"
3. Choose one of the following sign-up methods:
   - **Email and Password**: Enter your email address and create a password
     (minimum 8 characters)
   - **Google Account**: Click "Continue with Google" to sign up using your
     Google account
4. After signing up, you'll be redirected to your dashboard

### Logging In

1. Navigate to the login page
2. Enter your email and password, or click "Continue with Google"
3. You'll be redirected to your dashboard

## Features

### Content Discovery

#### Search

- **Universal Search**: Search for movies and TV shows in one place
- **Combined Results**: See both movies and TV shows in unified search results
- **Instant Results**: Results update as you type (debounced)

**How to Search:**

1. Navigate to the Search page
2. Type your search query in the search box
3. Results appear automatically showing posters and titles
4. Click on any result to view details

#### Browse

- **Trending**: Discover what's popular right now
- **New Releases**: Find recently released content
- **Personalised Feed**: See recommendations tailored to your taste

**How to Browse:**

1. Navigate to the Browse page
2. Scroll through different sections
3. Click on content to view details

### Your Library

Your library is where you organise and track all your content. It includes:

#### Watched List

Track content you've already watched.

**How to Mark as Watched:**

1. Navigate to a content detail page
2. Click "Mark as Watched"
3. Optionally add a rating and notes
4. The content appears in your Watched list

**Viewing Your Watched List:**

1. Navigate to Library
2. Click the "Watched" tab
3. See all your watched content with dates and ratings

#### Watchlist

Keep track of content you want to watch later.

**How to Add to Watchlist:**

1. Navigate to a content detail page
2. Click "Add to Watchlist"
3. The content appears in your To Watch list

**Viewing Your Watchlist:**

1. Navigate to Library
2. Click the "To Watch" tab
3. See all content you've added to your watchlist

#### Favourites

Mark your absolute favourite content.

**How to Mark as Favourite:**

1. Navigate to a content detail page
2. Click the heart/favourite icon
3. The content appears in your Favourites list

**Viewing Your Favourites:**

1. Navigate to Library
2. Click the "Favourites" tab
3. See all your favourite content

#### Custom Lists

Create custom lists to organise content by theme (e.g., "80s Horror", "Date
Night Movies").

**How to Create a List:**

1. Navigate to Library
2. Click "Create List"
3. Enter a name and optional description
4. Click "Create"

**How to Add Content to a List:**

1. Navigate to a content detail page
2. Click "Add to List"
3. Select the list from the dropdown
4. The content is added to your list

**Viewing Your Lists:**

1. Navigate to Library
2. Your custom lists appear in the sidebar or dropdown
3. Click on a list to view its contents

**Note**: Free tier users can create up to 3 custom lists. Premium users have
unlimited lists.

#### Tags

Organise content with custom tags.

**How to Create and Apply Tags:**

1. Navigate to a content detail page
2. Click "Add Tag"
3. Type a tag name and select a colour
4. Click "Create" or select an existing tag
5. The tag is applied to the content

**Filtering by Tags:**

1. Navigate to Library
2. Click on a tag in the filter sidebar
3. Only content with that tag is displayed
4. Select multiple tags for AND filtering

#### Ratings

Rate content on a 1-10 scale with half-point precision (e.g., 8.5).

**How to Rate Content:**

1. Navigate to a content detail page
2. Click on the rating component
3. Select your rating (1-10)
4. Your rating is saved and displayed

#### Notes

Add private notes to any content.

**How to Add Notes:**

1. Navigate to a content detail page
2. Click "Add Note" or "Edit Note"
3. Enter your note text
4. Click "Save"
5. Your note is saved and displayed (only visible to you)

### AI Recommendations

Stream Owl provides personalised recommendations powered by AI.

#### Daily Recommendations

- **Personalised Feed**: See recommendations tailored to your viewing history
- **Explanations**: Each recommendation includes an explanation of why you might
  like it
- **Daily Updates**: Recommendations refresh daily

**Viewing Recommendations:**

1. Navigate to your home page (dashboard)
2. Scroll to the "Recommendations" section
3. See your personalised recommendations with explanations

**Free Tier**: 3 recommendations per day **Premium Tier**: Unlimited
recommendations

#### Dismissing Recommendations

If you're not interested in a recommendation:

1. Click "Not Interested" on the recommendation card
2. The recommendation is removed from your feed
3. Dismissed content won't be recommended again

#### Adding Recommended Content

1. Click "Add to Watchlist" on a recommendation card
2. The content is added to your watchlist
3. The card updates to show it's been added

### Content Details

#### Viewing Content Details

1. Click on any content from search, browse, or your library
2. View the content detail page with:
   - Poster and backdrop images
   - Synopsis and overview
   - Release date and runtime
   - Cast and crew information
   - Streaming availability
   - Trailer (if available)
   - Similar titles

#### Streaming Availability

See where content is available to watch:

1. Navigate to a content detail page
2. Scroll to "Where to Watch" section
3. See streaming services where the content is available
4. Click on a service to open it (deep links supported where available)

**Note**: Availability is shown for your region. You can change your region in
Settings.

### Settings

#### Profile Settings

1. Navigate to Settings
2. Update your display name
3. Change your avatar (premium feature)
4. Update your preferences

#### Region Settings

Change your region to see different streaming availability:

1. Navigate to Settings
2. Find "Region" section
3. Select your region from the dropdown
4. Streaming availability updates automatically

#### Public Profile

Make your profile public to share with others:

1. Navigate to Settings
2. Toggle "Public Profile" on
3. Copy your public profile URL
4. Share with others

#### Premium Subscription

Upgrade to premium for:

- Unlimited custom lists
- Unlimited AI recommendations
- Data export (CSV/JSON)
- Avatar upload

**How to Upgrade:**

1. Navigate to Premium page
2. Select monthly or yearly plan
3. Complete checkout with Stripe
4. Premium features unlock immediately

**Managing Subscription:**

1. Navigate to Settings
2. Click "Manage Subscription"
3. Opens Stripe customer portal
4. Update payment method or cancel subscription

## Troubleshooting

### Can't Log In

**Problem**: Unable to log in with email and password.

**Solutions**:

- Verify your email address is correct
- Check that your password is at least 8 characters
- Try resetting your password using "Forgot Password"
- Ensure you're using the correct account (check for typos in email)
- Clear your browser cookies and try again

**Problem**: "Too many failed login attempts" error.

**Solutions**:

- Wait 15 minutes before trying again
- This is a security feature to prevent brute force attacks
- Contact support if you believe this is an error

### Search Not Working

**Problem**: Search results not appearing.

**Solutions**:

- Check your internet connection
- Try refreshing the page
- Clear your browser cache
- Try a different search query
- Wait a moment and try again (may be temporary API issue)

### Content Not Loading

**Problem**: Content detail pages not loading.

**Solutions**:

- Refresh the page
- Check your internet connection
- Try navigating to a different content item
- Clear your browser cache
- Contact support if the problem persists

### Recommendations Not Showing

**Problem**: No recommendations appearing on home page.

**Solutions**:

- Ensure you've watched and rated some content (recommendations improve with
  more data)
- Check that you're logged in
- Refresh the page
- Recommendations update daily - check back tomorrow
- Free tier users get 3 recommendations per day - check if you've reached the
  limit

### Can't Add Content to Lists

**Problem**: Unable to add content to a custom list.

**Solutions**:

- Ensure you're logged in
- Check that you haven't reached the free tier limit (3 lists)
- Try refreshing the page
- Verify the list exists in your Library
- Try creating a new list

### Streaming Availability Not Showing

**Problem**: "Where to Watch" section is empty.

**Solutions**:

- Check your region settings (Settings > Region)
- Some content may not be available in your region
- Try changing your region to see different availability
- Content availability updates periodically - check back later

### Premium Features Not Working

**Problem**: Premium features not accessible after upgrading.

**Solutions**:

- Log out and log back in
- Refresh the page
- Check your subscription status in Settings
- Contact support with your account email if the problem persists

### Data Not Saving

**Problem**: Ratings, notes, or lists not saving.

**Solutions**:

- Check your internet connection
- Ensure you're logged in
- Try refreshing the page
- Clear your browser cache
- Try logging out and logging back in

### General Issues

**Problem**: Something isn't working as expected.

**Solutions**:

- Refresh the page
- Clear your browser cache and cookies
- Try a different browser
- Check that JavaScript is enabled
- Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
- Contact support with:
  - Description of the problem
  - Steps to reproduce
  - Browser and version
  - Screenshots if possible

## Tips and Best Practices

### Getting Better Recommendations

- **Rate Content**: Rate content you've watched to improve recommendations
- **Mark as Watched**: Mark content as watched to build your taste profile
- **Add to Favourites**: Mark favourites to help the AI understand your
  preferences
- **Be Patient**: Recommendations improve over time as you use the app more

### Organising Your Library

- **Use Tags**: Create meaningful tags to organise content (e.g., "Comfort
  Watch", "Must See")
- **Create Lists**: Organise content by theme or occasion
- **Add Notes**: Keep notes about why you liked something or what you thought
- **Rate Consistently**: Use consistent rating criteria for better
  recommendations

### Finding Content

- **Use Search**: Search is the fastest way to find specific content
- **Browse Trending**: Check trending content to discover popular titles
- **Check New Releases**: Browse new releases to find fresh content
- **Explore Similar**: Use "Similar Titles" on content pages to discover related
  content

### Managing Your Account

- **Keep Email Updated**: Ensure your email is current for password resets
- **Use Strong Password**: Use a strong, unique password for your account
- **Enable Public Profile**: Share your profile and lists with others
- **Export Data**: Premium users can export their data for backup

## Support

If you need help or have questions:

1. Check this documentation first
2. Review the troubleshooting section
3. Contact support through the app
4. Check for updates and announcements

## Privacy

- Your notes and ratings are private by default
- Only content you mark as "public" is visible to others
- Your viewing history is private
- You can delete your account and all data at any time (Settings > Delete
  Account)

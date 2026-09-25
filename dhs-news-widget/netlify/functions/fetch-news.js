const https = require('https');
const http = require('http');

const RSS_FEEDS = [
    { name: 'FedScoop', url: 'https://fedscoop.com/feed/' },
    { name: 'Nextgov', url: 'https://www.nextgov.com/rss/' },
    { name: 'GovExec', url: 'https://www.govexec.com/rss/channel/excellence/' },
    { name: 'Federal News Network', url: 'https://federalnewsnetwork.com/feed/' },
    { name: 'FCW', url: 'https://fcw.com/rss-feeds/all/' },
    { name: 'Defense One', url: 'https://www.defenseone.com/rss/all/' },
    { name: 'CyberScoop', url: 'https://cyberscoop.com/feed/' },
    { name: 'Defense News', url: 'https://www.defensenews.com/arc/outboundfeeds/rss/' },
    { name: 'Politico', url: 'https://www.politico.com/rss/politics08.xml' }
];

const AGENCIES = [
    { name: 'DHS', keywords: ['Department of Homeland Security', 'DHS'] },
    { name: 'CISA', keywords: ['CISA', 'Cybersecurity and Infrastructure Security Agency'] },
    { name: 'TSA', keywords: ['TSA', 'Transportation Security Administration'] },
    { name: 'FEMA', keywords: ['FEMA', 'Federal Emergency Management Agency'] },
    { name: 'ICE', keywords: ['ICE immigration', 'Immigration and Customs Enforcement'] },
    { name: 'CBP', keywords: ['CBP', 'Customs and Border Protection'] },
    { name: 'USCG', keywords: ['Coast Guard', 'USCG', 'U.S. Coast Guard'] },
    { name: 'USSS', keywords: ['Secret Service', 'USSS'] },
    { name: 'USCIS', keywords: ['USCIS', 'U.S. Citizenship and Immigration Services'] },
    { name: 'FLETC', keywords: ['FLETC', 'Federal Law Enforcement Training Centers'] },
    { name: 'CWMD', keywords: ['CWMD', 'Countering Weapons of Mass Destruction'] }
];

const CONTRACT_KEYWORDS = ['contract', 'contracts', 'contracting', 'contractor', 'procurement', 'solicitation', 'RFP', 'RFI', 'award'];
const SPENDING_KEYWORDS = ['budget', 'spending', 'funding', 'appropriation', 'grant', 'investment', 'billion', 'million'];

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, { timeout: 10000 }, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
    });
}

function parseRSS(xmlText, sourceName) {
    const articles = [];

    // Simple regex-based parsing (works for most RSS/Atom feeds)
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;

    let matches = [...xmlText.matchAll(itemRegex)];

    // Try Atom format if RSS didn't match
    if (matches.length === 0) {
        matches = [...xmlText.matchAll(entryRegex)];
    }

    for (const match of matches.slice(0, 30)) {
        const itemContent = match[1];

        const title = extractTag(itemContent, 'title');
        const link = extractTag(itemContent, 'link') || extractAttribute(itemContent, 'link', 'href');
        const description = extractTag(itemContent, 'description') ||
                          extractTag(itemContent, 'summary') ||
                          extractTag(itemContent, 'content:encoded') ||
                          extractTag(itemContent, 'content');
        const pubDate = extractTag(itemContent, 'pubDate') ||
                       extractTag(itemContent, 'published') ||
                       extractTag(itemContent, 'updated') ||
                       new Date().toISOString();

        if (title && link) {
            articles.push({
                title: stripHtml(title).trim(),
                description: stripHtml(description).trim().substring(0, 300),
                url: link.trim(),
                source: sourceName,
                publishedAt: pubDate
            });
        }
    }

    return articles;
}

function extractTag(text, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
    const match = text.match(regex);
    return match ? match[1] : '';
}

function extractAttribute(text, tagName, attrName) {
    const regex = new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']+)["']`, 'i');
    const match = text.match(regex);
    return match ? match[1] : '';
}

function stripHtml(html) {
    if (!html) return '';

    return html
        // Strip CDATA tags
        .replace(/<!\[CDATA\[/g, '')
        .replace(/\]\]>/g, '')
        // Remove HTML tags
        .replace(/<[^>]+>/g, '')
        // Decode common HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#8217;/g, "'")  // Right single quote
        .replace(/&#8216;/g, "'")  // Left single quote
        .replace(/&#8220;/g, '"')  // Left double quote
        .replace(/&#8221;/g, '"')  // Right double quote
        .replace(/&#8211;/g, '-')  // En dash
        .replace(/&#8212;/g, '—')  // Em dash
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, '"')
        .replace(/&ldquo;/g, '"')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '-')
        // Decode any remaining numeric entities
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        // Clean up whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

function filterAndTagArticles(articles) {
    // Filter for DHS-related articles
    const dhsArticles = articles.filter(article => {
        const fullText = `${article.title} ${article.description}`.toLowerCase();
        return AGENCIES.some(agency =>
            agency.keywords.some(kw => fullText.includes(kw.toLowerCase()))
        );
    });

    // Tag articles
    const taggedArticles = dhsArticles.map(article => {
        const fullText = `${article.title} ${article.description}`.toLowerCase();

        const matchedAgencies = AGENCIES.filter(agency =>
            agency.keywords.some(kw => fullText.includes(kw.toLowerCase()))
        ).map(a => a.name);

        const hasContract = CONTRACT_KEYWORDS.some(kw => fullText.includes(kw.toLowerCase()));
        const hasSpending = SPENDING_KEYWORDS.some(kw => fullText.includes(kw.toLowerCase()));

        let priority = 0;
        if (hasContract) priority += 10;
        if (hasSpending) priority += 10;
        priority += matchedAgencies.length * 2;

        return {
            ...article,
            agencies: matchedAgencies,
            hasContract,
            hasSpending,
            priority
        };
    });

    // Sort by priority
    taggedArticles.sort((a, b) => {
        if (b.priority !== a.priority) {
            return b.priority - a.priority;
        }
        return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    // Return all articles (no limit)
    return taggedArticles;
}

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        console.log('Fetching RSS feeds...');

        let allArticles = [];
        let successCount = 0;
        let failCount = 0;

        // Fetch feeds sequentially to avoid overwhelming servers
        for (const feed of RSS_FEEDS) {
            try {
                console.log(`Fetching ${feed.name}...`);
                const xmlText = await fetchUrl(feed.url);
                const articles = parseRSS(xmlText, feed.name);
                allArticles = allArticles.concat(articles);
                successCount++;
                console.log(`✓ ${feed.name}: ${articles.length} articles`);
            } catch (error) {
                failCount++;
                console.warn(`✗ ${feed.name}: ${error.message}`);
            }
        }

        console.log(`Fetched ${allArticles.length} total articles (${successCount} feeds succeeded, ${failCount} failed)`);

        // Filter and tag
        const filteredArticles = filterAndTagArticles(allArticles);
        console.log(`Returning ${filteredArticles.length} DHS-related articles`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                articles: filteredArticles,
                meta: {
                    totalArticles: allArticles.length,
                    dhsArticles: filteredArticles.length,
                    successfulFeeds: successCount,
                    failedFeeds: failCount,
                    timestamp: new Date().toISOString()
                }
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

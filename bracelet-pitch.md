# **Pitch Plan: AI Bracelet Builder**

## **1\. Title**

* Product name and tagline: **AI Bracelet Builder: design traditional bracelets without the guesswork**  
* Team names, roles, and a contact email  
* Optional: photo of a finished bracelet as the background

## **2\. Problem / Opportunity**

* **Show your own bracelet** with overly long strings. Explain what it cost you: wasted thread and slower, fiddlier knotting.  
* **Show a BraceletBook screenshot** and point to what's confusing: it's hard to see how knots turn into colours.  
* **The blank page:** most makers copy patterns because designing traditional ones from scratch feels like trial and error.  
* **Market size:**  
  * BraceletBook has about 791,785 users and roughly 218,000 patterns  
  * It gets about 1.3M visits a month, with about 10 pages per visit  
  * Top countries: United States (about 32%) and Canada (about 6%)  
  * r/friendshipbracelets has about 30,154 members  
  * Friendship bracelets surged in popularity in 2023, linked to Taylor Swift  
  * Benchmark from a similar craft: Ravelry had almost 9 million registered users and approximately 1 million monthly active users as of 2020  
* **Suggested line:** "BraceletBook gets about 1.3 million visits a month, but creating patterns there is still trial and error."

## **3\. Value Proposition**

* **One sentence:** "Describe the bracelet you want, get a pattern you can actually knot, with exact string lengths."  
* **What it is:**  
  * Pixel-art style editor: paint the colours you want, and the tool works out the knots  
  * Linked knot view for makers who want direct control  
  * AI starting patterns from a text description or photo  
  * Remix: start from an existing pattern and recolour it  
  * Automatic string length calculator  
  * Share and discover: publish patterns, browse others' patterns, and remix them with credit to the original creator  
* **Value to the user:** less wasted thread, no blank page, and beginners can design their own patterns instead of only copying  
* **Visual idea:** before (graph paper, guessing) vs. after (your tool)

## **4\. Underlying Magic**

* **Flow diagram:**  
  1. User types "8-string sunset chevron" or uploads a photo  
  2. AI turns it into a structured recipe: number of strings, colours, pattern type, symmetry  
  3. A rules-based pattern engine builds the knot grid from that recipe  
  4. User sees a live preview and string lengths  
* **Why it matters:** the AI never draws knots directly, so every pattern follows real knotting rules. This answers the biggest risk: can AI produce patterns that actually knot correctly?  
* **String calculator:** knots per string × length per knot \+ extra for the starting knot and tails. It improves as users report "ran short" or "too long."  
* **Smarter library:** every pattern is stored as structured data, so users can search by number of strings or colours, remixes credit the original creator, and every shared pattern shows string lengths automatically.  
* **Live demo:** type a description, show the pattern, change one colour, show lengths updating. Keep a screen recording as a backup.

## **5\. Business Model**

* **Who pays:**  
  * Advertisers, through ads shown to free users  
  * Premium subscribers  
  * Thread retailers, through affiliate links (the calculator already produces a shopping list)  
* **Free tier:** editor, calculator, remix, sharing and browsing, and a few AI generations per month  
* **Premium tier:** unlimited AI generations, photo-to-pattern, unlimited private saves, no ads, printable patterns, creator profile badges  
* **Price:** \$2.99/month or \$19.99/year  
  * Why not \$1/month: card processors take around 3% plus roughly 30 cents per payment, so about a third of each \$1 is lost  
  * App stores take 15% for small developers, so about 85% of each payment is kept  
* **Why free first:** buyer power is high and switching is free, so a paywall upfront would push users back to existing tools  
* **Safety and age:** 13+ age requirement, no private messaging, moderated comments. This also avoids the lower ad rates and stricter rules for under-13 users.

## **6\. Go-to-Market Plan**

* **Phase 1, before launch (months 1 to 2):**  
  * Release the free string calculator on its own  
  * Post it in bracelet subreddits and collect a waitlist  
  * Build a calculator page for searches like "how much string for a friendship bracelet" (about 39% of BraceletBook's traffic comes from search)  
  * Seed the pattern library with designs from partner creators  
* **Phase 2, launch with beginner-focused creators (months 3 to 6):**  
  * Partner with micro-influencers who make beginner tutorials on TikTok, YouTube, and Instagram  
  * Give them free premium, a creator page, and a referral code that earns commission  
  * Ask them to design a pattern in the tool on camera  
* **Community growth:**  
  * Monthly themed design challenges  
  * Every exported or shared pattern includes "Made with \[product\]" and a link (a measurable referral loop, not "going viral")  
  * Never copy BraceletBook patterns to fill the library, since they belong to their creators  
* **Partnerships (months 6 to 12):**  
  * Thread brands and craft stores: affiliate links and co-branded beginner pattern packs  
  * Summer camps, libraries, and youth programs  
* **Seasonal timing:** summer camp season, concert and festival season, back to school  
* **Metric to show:** cost to acquire each user, and users brought in per creator

## **7\. Competitive Analysis**

| Feature | Us | BraceletBook | Codecraft | Friendship Bracelets Pro | MakeBead |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Works in browser | ✓ | ✓ | ✗ | ✗ | ✓ |
| Create patterns in the app | ✓ | ✗ | ✓ | ✓ | ✗ |
| Traditional patterns | ✓ | ✓ | ✓ | ✓ | ✗ |
| Photo-to-pattern | ✓ | ✓ | ✗ | ✗ | ✓ |
| String calculator | ✓ | ? | ✓ | ? | ✓ |
| AI text-to-pattern | ✓ | ✗ | ✗ | ✗ | ✗ |
| Explains knots in plain words | ✓ | ✗ | ✗ | ✗ | ✗ |
| Share and browse patterns | ✓ | ✓ | ✗ | ✗ | ✗ |
| Library size | Small at launch | \~218,000 | ✗ | ✗ | ✗ |

* Verify the "?" cells before designing the slide  
* Keep the library size row: a table where you win everything looks less credible, and your answer is the seeding plan from slide 6  
* Don't claim there's no competition. Your edge is AI generation plus beginner focus, since features alone are easy to copy.

## **8\. Management Team**

* Have fun with it, but make it clear who builds the product and who handles marketing

## **9\. Financial Projections and Key Metrics**

* Show Years 1 to 3 on the slide (Kawasaki recommends three years) and keep Years 4 and 5 as a backup slide  
* **Where Year 1 users come from:**  
  * 10 micro-creators × 20,000 followers × 2% who sign up \= 4,000 users  
  * Reddit, search, and word of mouth \= about 1,000 users  
  * Total: about 5,000 monthly active users  
* **Assumptions:**  
  * 12 pages viewed per user per month  
  * \$4 ad revenue per 1,000 page views  
  * 2% of users convert to premium at \$2.99/month, about 85% kept after fees

|  | Y1 | Y2 | Y3 | Y4 | Y5 |
| ----- | ----- | ----- | ----- | ----- | ----- |
| Monthly active users | 5,000 | 20,000 | 50,000 | 90,000 | 140,000 |
| Premium subscribers (2%) | 100 | 400 | 1,000 | 1,800 | 2,800 |
| Ad revenue | \$2,880 | \$11,520 | \$28,800 | \$51,840 | \$80,640 |
| Subscription revenue (net) | \$3,050 | \$12,199 | \$30,498 | \$54,896 | \$85,394 |
| **Total revenue** | **\$5,930** | **\$23,719** | **\$59,298** | **\$106,736** | **\$166,034** |
| App store accounts | \$125 | \$100 | \$100 | \$100 | \$100 |
| Servers and hosting | \$600 | \$1,800 | \$4,000 | \$7,000 | \$10,000 |
| AI computing | \$500 | \$1,500 | \$3,500 | \$6,000 | \$9,000 |
| Storage and moderation | \$300 | \$1,000 | \$3,000 | \$6,000 | \$10,000 |
| Marketing | \$3,000 | \$8,000 | \$15,000 | \$20,000 | \$25,000 |
| Domain and tools | \$300 | \$300 | \$300 | \$300 | \$300 |
| **Total costs** | **\$4,825** | **\$12,700** | **\$25,900** | **\$39,400** | **\$54,400** |
| **Profit** | **\$1,105** | **\$11,019** | **\$33,398** | **\$67,336** | **\$111,634** |

* **Formulas:** ad revenue \= users × 12 pages × 12 months × \$4 ÷ 1,000. Subscription revenue \= subscribers × \$2.99 × 12 × 85%.  
* **App store fees:** Apple charges 99 USD per membership year, and Google charges a one time US\$25 registration fee  
* **About free AI models:** the model is free, but running it needs a server. Keeping most AI generation in premium ties this cost to paying users.  
* **Not counted (upside):** affiliate revenue and expansion to other crafts like beading and cross-stitch  
* **Key metrics:** monthly active users, premium conversion rate, return rate (target: 20% of visitors return), patterns created and shared per month, cost to acquire each user  
* **Honest framing:** this is a small, low-cost business, and founder salaries aren't included. Years 4 and 5 assume about a third of BraceletBook's traffic, which is ambitious for a newcomer. Say this yourself, and point to multi-craft expansion as the path to bigger numbers. Avoid calling the projections "conservative."

## **10\. Status, Timeline, and Use of Funds**

* **Status:** research and competitor analysis done, prototype ready to demo  
* **Milestones:**  
  * Month 1: string calculator live  
  * Month 3: full editor and pattern sharing launch on the web  
  * Month 6: AI premium features  
  * Months 9 to 12: mobile apps  
* **The ask:** an amount tied to specific milestones, mainly for development time, creator marketing, and moderation. Example framing: "This gets us to 20,000 users by the end of Year 2."


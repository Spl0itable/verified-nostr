addEventListener('fetch', async (event) => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle OPTIONS preflight request for CORS
    if (request.method === 'OPTIONS') {
        return handleOptions(request);
    }

    // Handle zap confirmation notification (POST request)
    if (request.method === 'POST' && url.searchParams.has('notify-zap')) {
        try {
            const plan = url.searchParams.get('plan');
            const payerHexKey = url.searchParams.get('npub'); // Directly use as hex key (already in hex format)
            const billingCycle = url.searchParams.get('billingCycle') || 'monthly'; // Default to monthly if not provided
            if (!plan || !payerHexKey) {
                return new Response("Missing plan or payer public key.", { status: 400, headers: corsHeaders() });
            }

            // Save to GitHub whitelist based on plan
            const success = await saveToGitHubWhitelist(plan, payerHexKey);
            if (!success) {
                return new Response("Failed to save to whitelist.", { status: 500, headers: corsHeaders() });
            }

            // Store subscription details in R2 bucket with logic to check existing subscriptions
            const subscriptionSaved = await saveSubscriptionToR2(plan, payerHexKey, billingCycle);
            if (!subscriptionSaved) {
                console.error("Failed to save subscription details to R2 bucket.");
                // Note: We won't fail the response if R2 save fails, just log the error
            }

            // Determine the redirect URL based on the plan
            let redirectUrl;
            switch (plan.toLowerCase()) {
                case 'purple':
                    redirectUrl = 'https://nostraddress.com/ty-purple';
                    break;
                case 'onyx':
                    redirectUrl = 'https://nostraddress.com/ty-onyx';
                    break;
                default:
                    redirectUrl = 'https://nostraddress.com';
            }

            return new Response(JSON.stringify({ success: true, message: `Subscribed to ${plan} plan.`, redirectUrl }), {
                status: 200,
                headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
            });
        } catch (error) {
            console.error("Error processing zap notification:", error.message);
            return new Response("Error processing zap notification: " + error.message, { status: 500, headers: corsHeaders() });
        }
    }

    // Handle discount code validation (AJAX endpoint)
    if (request.method === 'POST' && pathname === '/validate-discount') {
        try {
            const body = await request.json();
            const code = body.code;
            const btcPrice = await fetchBitcoinPrice();
            let pricingData = await fetchPricingFromR2();

            if (!code) {
                return new Response(JSON.stringify({ success: false, message: "No discount code provided." }), {
                    status: 400,
                    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
                });
            }

            const discountResult = await applyDiscountCode(code, pricingData, btcPrice);
            if (discountResult.applied) {
                pricingData = discountResult.pricing;
                const purpleMonthlySats = (discountResult.discountType === "fixed_sats" && discountResult.appliesToBillingCycle.includes("monthly") && discountResult.appliesToPlans.includes("purple")) ? discountResult.fixedSats : usdToSats(pricingData.monthly.purple, btcPrice);
                const onyxMonthlySats = (discountResult.discountType === "fixed_sats" && discountResult.appliesToBillingCycle.includes("monthly") && discountResult.appliesToPlans.includes("onyx")) ? discountResult.fixedSats : usdToSats(pricingData.monthly.onyx, btcPrice);
                const purpleYearlySats = (discountResult.discountType === "fixed_sats" && discountResult.appliesToBillingCycle.includes("yearly") && discountResult.appliesToPlans.includes("purple")) ? discountResult.fixedSats : usdToSats(pricingData.yearly.purple, btcPrice);
                const onyxYearlySats = (discountResult.discountType === "fixed_sats" && discountResult.appliesToBillingCycle.includes("yearly") && discountResult.appliesToPlans.includes("onyx")) ? discountResult.fixedSats : usdToSats(pricingData.yearly.onyx, btcPrice);

                return new Response(JSON.stringify({
                    success: true,
                    message: discountResult.message,
                    pricing: pricingData,
                    sats: {
                        monthly: {
                            purple: purpleMonthlySats,
                            onyx: onyxMonthlySats
                        },
                        yearly: {
                            purple: purpleYearlySats,
                            onyx: onyxYearlySats
                        }
                    }
                }), {
                    status: 200,
                    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
                });
            } else {
                return new Response(JSON.stringify({ success: false, message: discountResult.message }), {
                    status: 400,
                    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
                });
            }
        } catch (error) {
            console.error("Error validating discount code:", error.message);
            return new Response(JSON.stringify({ success: false, message: "Error validating discount code." }), {
                status: 500,
                headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
            });
        }
    }

    // Handle subscription time check (AJAX endpoint)
    if (request.method === 'POST' && pathname === '/check-subscription') {
        try {
            const body = await request.json();
            const pubkey = body.pubkey;

            if (!pubkey) {
                return new Response(JSON.stringify({ success: false, message: "No public key provided." }), {
                    status: 400,
                    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
                });
            }

            const subscriptionKey = `subscriptions/${pubkey}.json`;
            const expiredKey = `expired/${pubkey}.json`;

            // First, check for an active subscription in subscriptions/
            let subscriptionObject = await R2_BUCKET.get(subscriptionKey);

            if (subscriptionObject) {
                const subscriptionData = JSON.parse(await subscriptionObject.text());
                const currentTimestamp = Math.floor(Date.now() / 1000);
                const endTimestamp = subscriptionData.subscriptionEnd;
                const remainingSeconds = Math.max(0, endTimestamp - currentTimestamp);
                const remainingDays = Math.floor(remainingSeconds / (24 * 60 * 60));
                const remainingHours = Math.floor((remainingSeconds % (24 * 60 * 60)) / (60 * 60));
                const isNearExpiry = remainingDays <= 7 && remainingSeconds > 0;
                const plan = subscriptionData.plan.charAt(0).toUpperCase() + subscriptionData.plan.slice(1);
                const billingCycle = subscriptionData.billingCycle;

                let message = `Your ${plan} (${billingCycle}) subscription has ${remainingDays} days and ${remainingHours} hours remaining.`;
                let suggestion = "";

                if (isNearExpiry) {
                    suggestion = `Your subscription is expiring soon! Add more time by clicking the Zap button for your current plan, or upgrade/downgrade by selecting a different plan.`;
                } else if (remainingSeconds === 0) {
                    suggestion = `Your subscription has expired. Renew by clicking the Zap button for your desired plan.`;
                }

                return new Response(JSON.stringify({
                    success: true,
                    message,
                    suggestion,
                    plan: subscriptionData.plan,
                    billingCycle: subscriptionData.billingCycle,
                    remainingDays,
                    isNearExpiry: isNearExpiry || remainingSeconds === 0
                }), {
                    status: 200,
                    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
                });
            }

            // If no active subscription, check expired/ directory
            let expiredObject = await R2_BUCKET.get(expiredKey);
            if (expiredObject) {
                const expiredData = JSON.parse(await expiredObject.text());
                const plan = expiredData.plan.charAt(0).toUpperCase() + expiredData.plan.slice(1);
                const billingCycle = expiredData.billingCycle;
                const message = `Your ${plan} (${billingCycle}) subscription has expired.`;
                const suggestion = `Renew your subscription by clicking the Zap button for your desired plan, or choose a different plan to upgrade/downgrade.`;

                return new Response(JSON.stringify({
                    success: false,
                    message,
                    suggestion,
                    plan: expiredData.plan,
                    billingCycle: expiredData.billingCycle,
                    remainingDays: 0,
                    isNearExpiry: true
                }), {
                    status: 200,
                    headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
                });
            }

            // If no subscription found in either directory
            return new Response(JSON.stringify({
                success: false,
                message: "No subscription found for this public key.",
                suggestion: "Subscribe now to access premium features by clicking the Zap button for your desired plan!"
            }), {
                status: 404,
                headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error("Error checking subscription:", error.message);
            return new Response(JSON.stringify({ success: false, message: "Error checking subscription." }), {
                status: 500,
                headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
            });
        }
    }

    // Render the subscription page with dynamic SATS pricing
    if (request.method === 'GET' && pathname === '/subscribe') {
        try {
            const btcPrice = await fetchBitcoinPrice();
            let pricingData = await fetchPricingFromR2();
            let discountMessage = "";
            let discountApplied = false;
            let discountResult = null;

            // Check for discount code in query parameters
            const discountCode = url.searchParams.get('code');
            if (discountCode) {
                discountResult = await applyDiscountCode(discountCode, pricingData, btcPrice);
                if (discountResult.applied) {
                    pricingData = discountResult.pricing;
                    discountMessage = discountResult.message;
                    discountApplied = true;
                } else {
                    discountMessage = discountResult.message;
                }
            }

            // Calculate SATS based on adjusted pricing data, respecting appliesTo for fixed_sats
            const purpleMonthlySats = (discountResult && discountResult.applied && discountResult.discountType === "fixed_sats" && discountResult.appliesToBillingCycle.includes("monthly") && discountResult.appliesToPlans.includes("purple")) ? discountResult.fixedSats : usdToSats(pricingData.monthly.purple, btcPrice);
            const onyxMonthlySats = (discountResult && discountResult.applied && discountResult.discountType === "fixed_sats" && discountResult.appliesToBillingCycle.includes("monthly") && discountResult.appliesToPlans.includes("onyx")) ? discountResult.fixedSats : usdToSats(pricingData.monthly.onyx, btcPrice);
            const purpleYearlySats = (discountResult && discountResult.applied && discountResult.discountType === "fixed_sats" && discountResult.appliesToBillingCycle.includes("yearly") && discountResult.appliesToPlans.includes("purple")) ? discountResult.fixedSats : usdToSats(pricingData.yearly.purple, btcPrice);
            const onyxYearlySats = (discountResult && discountResult.applied && discountResult.discountType === "fixed_sats" && discountResult.appliesToBillingCycle.includes("yearly") && discountResult.appliesToPlans.includes("onyx")) ? discountResult.fixedSats : usdToSats(pricingData.yearly.onyx, btcPrice);

            return new Response(renderSubscriptionPage(
                purpleMonthlySats, onyxMonthlySats,
                purpleYearlySats, onyxYearlySats,
                pricingData, // Pass pricing data to render function for USD display
                discountMessage, // Pass discount message if any
                discountApplied // Pass whether discount was applied
            ), {
                status: 200,
                headers: { ...corsHeaders(), 'Content-Type': 'text/html' },
            });
        } catch (error) {
            console.error("Error in subscription page rendering:", error.message);
            return new Response("Error fetching Bitcoin price or pricing data. Please try again later.", { status: 500, headers: corsHeaders() });
        }
    }

    return new Response("Not found.", { status: 404, headers: corsHeaders() });
}

// Handle CORS preflight requests
function handleOptions(request) {
    const headers = corsHeaders();
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS, POST";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    return new Response(null, { headers });
}

// CORS headers
function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true",
    };
}

// Fetch current Bitcoin price in USD with fallback
async function fetchBitcoinPrice() {
    try {
        // Try Coinbase API first
        const coinbaseResponse = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
        if (coinbaseResponse.ok) {
            const data = await coinbaseResponse.json();
            return parseFloat(data.data.amount); // Returns BTC price in USD
        } else {
            console.error("Coinbase API failed with status:", coinbaseResponse.status);
            // Fallback to CoinDesk API
            const coindeskResponse = await fetch('https://api.coindesk.com/v1/bpi/currentprice/BTC.json');
            if (coindeskResponse.ok) {
                const data = await coindeskResponse.json();
                return data.bpi.USD.rate_float; // Returns BTC price in USD
            } else {
                console.error("CoinDesk API failed with status:", coindeskResponse.status);
                // If both APIs fail, use a hardcoded fallback price (e.g., $60,000 per BTC)
                console.log("Using fallback Bitcoin price of $60,000 due to API failures.");
                return 60000;
            }
        }
    } catch (error) {
        console.error("Error fetching Bitcoin price:", error.message);
        // Use a hardcoded fallback price if fetch fails due to network or parsing errors
        console.log("Using fallback Bitcoin price of $60,000 due to fetch error.");
        return 60000;
    }
}

// Convert USD to SATS based on current BTC price
function usdToSats(usdAmount, btcPrice) {
    const btcAmount = usdAmount / btcPrice;
    return Math.round(btcAmount * 100000000); // 1 BTC = 100,000,000 SATS
}

// Fetch pricing data from R2 bucket
async function fetchPricingFromR2() {
    try {
        const pricingKey = 'pricing/plans.json';
        const pricingObject = await R2_BUCKET.get(pricingKey);
        if (pricingObject) {
            const pricingData = await pricingObject.text();
            return JSON.parse(pricingData);
        } else {
            console.error("Pricing data not found in R2 bucket. Using fallback pricing.");
            return getFallbackPricing();
        }
    } catch (error) {
        console.error("Error fetching pricing from R2 bucket:", error.message);
        return getFallbackPricing();
    }
}

// Hardcoded fallback pricing in case R2 fetch fails
function getFallbackPricing() {
    return {
        monthly: {
            purple: 2.99,
            onyx: 4.99
        },
        yearly: {
            purple: 29.99,
            onyx: 49.99
        }
    };
}

// Fetch discount codes from R2 bucket
async function fetchDiscountCodesFromR2() {
    try {
        const codesKey = 'pricing/codes.json';
        const codesObject = await R2_BUCKET.get(codesKey);
        if (codesObject) {
            const codesData = await codesObject.text();
            return JSON.parse(codesData);
        } else {
            console.error("Discount codes not found in R2 bucket. No codes available.");
            return { codes: {} };
        }
    } catch (error) {
        console.error("Error fetching discount codes from R2 bucket:", error.message);
        return { codes: {} };
    }
}

// Validate discount code and apply discount to pricing data
async function applyDiscountCode(code, pricingData, btcPrice) {
    const discountData = await fetchDiscountCodesFromR2();
    const currentDate = new Date().toISOString();
    const adjustedPricing = JSON.parse(JSON.stringify(pricingData)); // Deep copy of pricing data

    if (!code || !discountData.codes[code]) {
        console.log("No valid discount code provided or code not found:", code);
        return { applied: false, pricing: pricingData, message: "Invalid discount code." };
    }

    const discount = discountData.codes[code];

    // Check if code is expired
    if (discount.validUntil && currentDate > discount.validUntil) {
        console.log("Discount code expired:", code);
        return { applied: false, pricing: pricingData, message: "Discount code has expired." };
    }

    // Check usage limit
    if (discount.usageLimit !== undefined && discount.usedCount >= discount.usageLimit) {
        console.log("Discount code usage limit reached:", code);
        return { applied: false, pricing: pricingData, message: "Discount code usage limit reached." };
    }

    // Apply discount to applicable plans and billing cycles
    const billingCycles = discount.appliesTo.billingCycle === "both" ? ["monthly", "yearly"] : [discount.appliesTo.billingCycle];
    const plans = discount.appliesTo.plans.includes("all") ? ["purple", "onyx"] : discount.appliesTo.plans;

    for (const cycle of billingCycles) {
        for (const plan of plans) {
            let originalPriceUsd = adjustedPricing[cycle][plan];
            let newPriceUsd = originalPriceUsd;
            if (discount.type === "percentage") {
                newPriceUsdDotNet = originalPriceUsd * (1 - discount.value / 100);
            } else if (discount.type === "fixed_usd") {
                newPriceUsd = Math.max(0, originalPriceUsd - discount.value); // Prevent negative price
            }
            // Update USD price
            adjustedPricing[cycle][plan] = newPriceUsd;
        }
    }

    // Increment usage count if limit is set (save back to R2)
    if (discount.usageLimit !== undefined) {
        discount.usedCount = (discount.usedCount || 0) + 1;
        try {
            await R2_BUCKET.put('pricing/codes.json', JSON.stringify(discountData, null, 2), {
                httpMetadata: { contentType: 'application/json' }
            });
            console.log("Updated discount code usage count for:", code);
        } catch (error) {
            console.error("Failed to update discount code usage count in R2:", error.message);
        }
    }

    console.log("Discount code applied successfully:", code);
    return {
        applied: true,
        pricing: adjustedPricing,
        message: "Discount applied successfully!",
        discountType: discount.type,
        discountValue: discount.value,
        fixedSats: discount.type === "fixed_sats" ? discount.value : null,
        appliesToBillingCycle: billingCycles, // Add billing cycle applicability
        appliesToPlans: plans // Add plan applicability
    };
}

// Save user's hex key to GitHub whitelist file and update .well-known/nostr.json files based on plan
async function saveToGitHubWhitelist(plan, payerHexKey) {
    const MAIN_REPO = 'CoinFundApp/verified-nostr';
    const PURPLE_REPO = 'CoinFundApp/verified-nostr-purple';
    const ONYX_REPO = 'CoinFundApp/verified-nostr-onyx';
    let whitelistFilePath = 'whitelist.txt';
    let nostrJsonFilePath = '.well-known/nostr.json';

    try {
        // GitHub API requires a token with repo write access (store in Cloudflare secrets)
        const GITHUB_TOKEN = GITHUB_ACCESS_TOKEN; // Define this in your environment variables
        if (!GITHUB_TOKEN) {
            console.error("GITHUB_ACCESS_TOKEN is not defined in environment variables.");
            return false;
        }

        // Determine which repositories to update based on the plan
        let reposToUpdate = [];
        if (plan.toLowerCase() === 'purple') {
            reposToUpdate.push({ repo: MAIN_REPO, updateWhitelist: true, updateNostrJson: true });
            reposToUpdate.push({ repo: PURPLE_REPO, updateWhitelist: false, updateNostrJson: true });
        } else if (plan.toLowerCase() === 'onyx') {
            reposToUpdate.push({ repo: MAIN_REPO, updateWhitelist: true, updateNostrJson: true });
            reposToUpdate.push({ repo: PURPLE_REPO, updateWhitelist: false, updateNostrJson: true });
            reposToUpdate.push({ repo: ONYX_REPO, updateWhitelist: false, updateNostrJson: true });
        } else {
            console.error("Invalid plan type:", plan);
            return false;
        }

        let allUpdatesSuccessful = true;

        // Process updates for each repository
        for (const { repo, updateWhitelist, updateNostrJson } of reposToUpdate) {
            // Update whitelist.txt if applicable
            if (updateWhitelist) {
                const whitelistApiUrl = `https://api.github.com/repos/${repo}/contents/${whitelistFilePath}`;
                console.log("Attempting to fetch GitHub whitelist file content from:", whitelistApiUrl);

                // Get current whitelist file content
                const whitelistResponse = await fetch(whitelistApiUrl, {
                    headers: {
                        'Authorization': `Bearer ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Nostr',
                    },
                });

                if (!whitelistResponse.ok) {
                    console.error("Failed to fetch GitHub whitelist file content. Status:", whitelistResponse.status, "Response:", await whitelistResponse.text());
                    allUpdatesSuccessful = false;
                    continue;
                }

                let whitelistContent = '';
                let whitelistSha = '';
                const whitelistData = await whitelistResponse.json();
                console.log("GitHub whitelist file data retrieved successfully.");
                whitelistContent = atob(whitelistData.content); // Decode base64 content
                whitelistSha = whitelistData.sha;

                // Trim any trailing newlines from existing content to avoid extra empty lines
                whitelistContent = whitelistContent.trimEnd();
                // Append the new hex key with a single newline if not already present
                if (!whitelistContent.includes(payerHexKey)) {
                    whitelistContent = whitelistContent ? `${whitelistContent}\n"${payerHexKey}",` : `"${payerHexKey}",`;
                } else {
                    console.log("Hex key already exists in whitelist:", payerHexKey);
                }

                // Encode content to base64
                const encodedWhitelistContent = btoa(whitelistContent);
                console.log("Attempting to update GitHub whitelist file with new content.");

                // Update whitelist file on GitHub
                const whitelistUpdateResponse = await fetch(whitelistApiUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Nostr',
                    },
                    body: JSON.stringify({
                        message: `Add ${payerHexKey} to whitelist in ${repo}`,
                        content: encodedWhitelistContent,
                        sha: whitelistSha || undefined,
                    }),
                });

                if (!whitelistUpdateResponse.ok) {
                    console.error("Failed to update GitHub whitelist file. Status:", whitelistUpdateResponse.status, "Response:", await whitelistUpdateResponse.text());
                    allUpdatesSuccessful = false;
                    continue;
                }

                console.log(`Successfully updated whitelist.txt in ${repo} with hex key:`, payerHexKey);
            }

            // Update .well-known/nostr.json if applicable
            if (updateNostrJson) {
                const nostrJsonApiUrl = `https://api.github.com/repos/${repo}/contents/${nostrJsonFilePath}`;
                console.log("Attempting to fetch GitHub nostr.json file content from:", nostrJsonApiUrl);

                // Get current nostr.json file content
                const nostrJsonResponse = await fetch(nostrJsonApiUrl, {
                    headers: {
                        'Authorization': `Bearer ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Nostr',
                    },
                });

                if (!nostrJsonResponse.ok) {
                    console.error("Failed to fetch GitHub nostr.json file content. Status:", nostrJsonResponse.status, "Response:", await nostrJsonResponse.text());
                    allUpdatesSuccessful = false;
                    continue;
                }

                let nostrJsonContent = '';
                let nostrJsonSha = '';
                const nostrJsonData = await nostrJsonResponse.json();
                console.log("GitHub nostr.json file data retrieved successfully.");
                nostrJsonContent = atob(nostrJsonData.content); // Decode base64 content
                nostrJsonSha = nostrJsonData.sha;

                // Parse existing JSON content
                let nostrJsonObj = JSON.parse(nostrJsonContent);
                const names = nostrJsonObj.names || {};

                // Check if the hex key already exists under any name
                let existingName = Object.keys(names).find(name => names[name] === payerHexKey);
                if (!existingName) {
                    // Find a unique name (e.g., incremental number or random identifier)
                    let newName = Object.keys(names).length.toString();
                    while (names[newName]) {
                        newName = (parseInt(newName) + 1).toString();
                    }
                    names[newName] = payerHexKey;
                    nostrJsonObj.names = names;
                } else {
                    console.log(`Hex key ${payerHexKey} already exists in nostr.json under name ${existingName} in ${repo}`);
                }

                // Convert updated JSON back to string
                const updatedNostrJsonContent = JSON.stringify(nostrJsonObj, null, 2);
                const encodedNostrJsonContent = btoa(updatedNostrJsonContent);
                console.log(`Attempting to update GitHub nostr.json file in ${repo} with new content.`);

                // Update nostr.json file on GitHub
                const nostrJsonUpdateResponse = await fetch(nostrJsonApiUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Nostr',
                    },
                    body: JSON.stringify({
                        message: `Add ${payerHexKey} to nostr.json in ${repo}`,
                        content: encodedNostrJsonContent,
                        sha: nostrJsonSha || undefined,
                    }),
                });

                if (!nostrJsonUpdateResponse.ok) {
                    console.error(`Failed to update GitHub nostr.json file in ${repo}. Status:`, nostrJsonUpdateResponse.status, "Response:", await nostrJsonUpdateResponse.text());
                    allUpdatesSuccessful = false;
                    continue;
                }

                console.log(`Successfully updated nostr.json in ${repo} with hex key:`, payerHexKey);
            }
        }

        // Purge Cloudflare cache for the updated URLs after successful update
        if (allUpdatesSuccessful) {
            await purgeCache(plan);
        }

        return allUpdatesSuccessful;
    } catch (error) {
        console.error("Error saving to GitHub:", error.message);
        return false;
    }
}

// Purge Cloudflare cache for the whitelist and nostr.json URLs
async function purgeCache(plan) {
    try {
        // Define the URLs to purge based on the plan
        let whitelistUrls = [
            'https://nostraddress.com/whitelist.txt',
            'https://nostraddress.com/.well-known/nostr.json'
        ];

        if (plan.toLowerCase() === 'purple') {
            whitelistUrls.push('https://nostraddress.com/purple/.well-known/nostr.json');
        } else if (plan.toLowerCase() === 'onyx') {
            whitelistUrls.push('https://nostraddress.com/purple/.well-known/nostr.json');
            whitelistUrls.push('https://nostraddress.com/onyx/.well-known/nostr.json');
        } else {
            console.error("Invalid plan for cache purge:", plan);
            return;
        }

        const purgeResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ files: whitelistUrls })
        });

        const result = await purgeResponse.json();
        if (result.success) {
            console.log(`Cache purged for URLs: ${whitelistUrls.join(', ')}`);
        } else {
            console.error(`Failed to purge cache for URLs: ${whitelistUrls.join(', ')}`, result.errors);
        }
    } catch (error) {
        console.error(`Error purging cache for plan ${plan}:`, error);
    }
}

// Purge Cloudflare cache for the whitelist URLs
async function purgeCache(plan) {
    try {
        // Define the URLs to purge based on the plan
        let whitelistUrls = [];
        if (plan.toLowerCase() === 'purple') {
            whitelistUrls = ['https://nostraddress.com/purple/whitelist.txt'];
        } else if (plan.toLowerCase() === 'onyx') {
            whitelistUrls = ['https://nostraddress.com/onyx/whitelist.txt'];
        } else {
            console.error("Invalid plan for cache purge:", plan);
            return;
        }

        const purgeResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ files: whitelistUrls })
        });

        const result = await purgeResponse.json();
        if (result.success) {
            console.log(`Cache purged for URLs: ${whitelistUrls.join(', ')}`);
        } else {
            console.error(`Failed to purge cache for URLs: ${whitelistUrls.join(', ')}`, result.errors);
        }
    } catch (error) {
        console.error(`Error purging cache for plan ${plan}:`, error);
    }
}

// Remove user's hex key from a specific GitHub whitelist file
async function removeFromGitHubWhitelist(plan, payerHexKey) {
    const GITHUB_REPO = 'CoinFundApp/verified-nostr';
    let filePath;
    switch (plan.toLowerCase()) {
        case 'purple':
            filePath = 'purple/whitelist.txt';
            break;
        case 'onyx':
            filePath = 'onyx/whitelist.txt';
            break;
        default:
            console.error("Invalid plan type for removal:", plan);
            return false;
    }

    try {
        // GitHub API requires a token with repo write access (store in Cloudflare secrets)
        const GITHUB_TOKEN = GITHUB_ACCESS_TOKEN; // Define this in your environment variables
        if (!GITHUB_TOKEN) {
            console.error("GITHUB_ACCESS_TOKEN is not defined in environment variables.");
            return false;
        }

        const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
        console.log("Attempting to fetch GitHub file content from:", apiUrl);

        // Get current file content
        const getResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Nostr',
            },
        });

        if (!getResponse.ok) {
            console.error("Failed to fetch GitHub file content. Status:", getResponse.status, "Response:", await getResponse.text());
            return false;
        }

        let content = '';
        let sha = '';
        const fileData = await getResponse.json();
        console.log("GitHub file data retrieved successfully.");
        content = atob(fileData.content); // Decode base64 content
        sha = fileData.sha;

        // Remove the hex key if present
        const lines = content.split('\n');
        const updatedLines = lines.filter(line => line.trim() !== payerHexKey);
        if (updatedLines.length === lines.length) {
            console.log("Hex key not found in whitelist for removal:", payerHexKey);
            return true; // Hex key not in whitelist, consider it a success
        }

        content = updatedLines.join('\n');
        // Encode updated content to base64
        const encodedContent = btoa(content);
        console.log("Attempting to update GitHub file by removing hex key.");

        // Update file on GitHub
        const updateResponse = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Nostr',
            },
            body: JSON.stringify({
                message: `Remove ${payerHexKey} from ${plan} whitelist`,
                content: encodedContent,
                sha: sha || undefined,
            }),
        });

        if (!updateResponse.ok) {
            console.error("Failed to update GitHub file. Status:", updateResponse.status, "Response:", await updateResponse.text());
            return false;
        }

        console.log("Successfully removed hex key from GitHub whitelist:", payerHexKey);

        // Purge Cloudflare cache for the whitelist URLs after successful removal
        await purgeCache(plan);

        return true;
    } catch (error) {
        console.error("Error removing from GitHub whitelist:", error.message);
        return false;
    }
}

// Save subscription details to R2 bucket, checking subscriptions/ and expired/ directories
async function saveSubscriptionToR2(plan, payerHexKey, billingCycle) {
    try {
        // Calculate expiration timestamp based on billing cycle
        const currentTimestamp = Math.floor(Date.now() / 1000); // Current time in seconds
        const expirationTimestamp = billingCycle === 'yearly'
            ? currentTimestamp + (365 * 24 * 60 * 60) // 365 days for yearly
            : currentTimestamp + (30 * 24 * 60 * 60); // 30 days for monthly

        // Prepare subscription data
        const subscriptionData = JSON.stringify({
            plan: plan.toLowerCase(),
            payerHexKey: payerHexKey,
            billingCycle: billingCycle,
            subscriptionStart: currentTimestamp,
            subscriptionEnd: expirationTimestamp
        });

        const subscriptionKey = `subscriptions/${payerHexKey}.json`;
        const expiredKey = `expired/${payerHexKey}.json`;

        // Step 1: Check if a subscription exists in subscriptions/
        let existingSubscription = await R2_BUCKET.get(subscriptionKey);
        if (existingSubscription) {
            console.log(`Existing subscription found for ${payerHexKey} in subscriptions/. Updating record.`);
            const existingData = JSON.parse(await existingSubscription.text());
            const oldPlan = existingData.plan;

            // Update the subscription record
            await R2_BUCKET.put(subscriptionKey, subscriptionData, {
                httpMetadata: { contentType: 'application/json' }
            });
            console.log(`Updated subscription details for ${payerHexKey} in R2 bucket.`);

            // Step 2: Check if the plan has changed, if so, move hex key between whitelists on GitHub
            if (oldPlan !== plan.toLowerCase()) {
                console.log(`Plan changed for ${payerHexKey} from ${oldPlan} to ${plan}. Moving hex key between whitelists.`);
                const removalSuccess = await removeFromGitHubWhitelist(oldPlan, payerHexKey);
                if (removalSuccess) {
                    const addSuccess = await saveToGitHubWhitelist(plan, payerHexKey);
                    if (!addSuccess) {
                        console.error(`Failed to add ${payerHexKey} to new plan ${plan} whitelist after removal from ${oldPlan}.`);
                        // Optionally, rollback the removal or log for manual intervention
                    }
                } else {
                    console.error(`Failed to remove ${payerHexKey} from old plan ${oldPlan} whitelist.`);
                }
            }

            return true;
        }

        // Step 3: If not in subscriptions/, check expired/ directory
        let expiredSubscription = await R2_BUCKET.get(expiredKey);
        if (expiredSubscription) {
            console.log(`Expired subscription found for ${payerHexKey} in expired/. Reactivating subscription.`);
            const expiredData = JSON.parse(await expiredSubscription.text());
            const oldPlan = expiredData.plan;

            // Move the subscription back to subscriptions/ with updated details
            await R2_BUCKET.put(subscriptionKey, subscriptionData, {
                httpMetadata: { contentType: 'application/json' }
            });
            // Delete the expired record
            await R2_BUCKET.delete(expiredKey);
            console.log(`Reactivated subscription for ${payerHexKey} by moving from expired/ to subscriptions/.`);

            // Step 4: Check if the plan has changed, if so, move hex key between whitelists on GitHub
            if (oldPlan !== plan.toLowerCase()) {
                console.log(`Plan changed for reactivated subscription ${payerHexKey} from ${oldPlan} to ${plan}. Moving hex key between whitelists.`);
                const removalSuccess = await removeFromGitHubWhitelist(oldPlan, payerHexKey);
                if (removalSuccess) {
                    const addSuccess = await saveToGitHubWhitelist(plan, payerHexKey);
                    if (!addSuccess) {
                        console.error(`Failed to add ${payerHexKey} to new plan ${plan} whitelist after removal from ${oldPlan}.`);
                        // Optionally, rollback the removal or log for manual intervention
                    }
                } else {
                    console.error(`Failed to remove ${payerHexKey} from old plan ${oldPlan} whitelist.`);
                }
            } else {
                // If plan is the same, ensure it's in the correct whitelist (in case it was removed previously)
                await saveToGitHubWhitelist(plan, payerHexKey);
            }

            return true;
        }

        // Step 5: If no record found in either directory, create a new subscription record
        console.log(`No existing subscription found for ${payerHexKey}. Creating new record.`);
        await R2_BUCKET.put(subscriptionKey, subscriptionData, {
            httpMetadata: { contentType: 'application/json' }
        });
        console.log(`Successfully created subscription details in R2 bucket for:`, payerHexKey);
        return true;
    } catch (error) {
        console.error("Error saving subscription to R2 bucket:", error.message);
        return false;
    }
}

// Render the subscription page with pricing table
function renderSubscriptionPage(purpleMonthlySats, onyxMonthlySats, purpleYearlySats, onyxYearlySats, pricingData, discountMessage = "", discountApplied = false) {
    // Store original pricing for strikethrough display
    const originalPricing = JSON.parse(JSON.stringify(pricingData)); // Deep copy of initial pricing
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <link rel="shortcut icon" href="https://nostraddress.com/assets/favicon.png" type="image/x-icon" />
            <link rel="icon" type="image/png" sizes="32x32" href="https://nostraddress.com/assets/favicon.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="https://nostraddress.com/assets/favicon.png" />
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Subscribe with Nostr + Bitcoin Lightning</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .container { max-width: 800px; margin: 0 auto; }
                h1 { font-size: 28px; margin-bottom: 30px; }
                .logo-container { margin-bottom: 50px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 15px; border: 1px solid #ddd; }
                th { background-color: #f2f2f2; font-size: 20px; }
                td { font-size: 18px; }
                button { font-size: 18px; padding: 10px 20px; background-color: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 5px; }
                button:hover { background-color: #45a049; }
                .toggle-container { margin: 20px 0; }
                .toggle-button { padding: 10px 20px; margin: 0 5px; background-color: #ddd; border: none; cursor: pointer; border-radius: 5px; font-size: 16px; }
                .toggle-button.active { background-color: #4CAF50; color: white; }
                .features-link { color: blue; text-decoration: underline; cursor: pointer; font-size: 14px; }
                .modal { display: none; position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); }
                .modal-content { background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 500px; border-radius: 10px; text-align: left; }
                .modal-content ul { padding-left: 20px; }
                .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
                .close:hover { color: black; }
                .discount-message { color: ${discountApplied ? 'green' : 'red'}; font-size: 16px; margin: 10px 0; }
                .discount-input { margin: 20px 0; }
                .discount-input input { padding: 8px; font-size: 16px; }
                .discount-input button { padding: 8px 16px; font-size: 16px; }
                .original-price { text-decoration: line-through; color: #888; font-size: 14px; margin-right: 5px; }
                .subscription-check { margin: 20px 0; margin-top: 150px; }
                .subscription-check button { padding: 8px 16px; font-size: 16px; }
                .subscription-result { margin: 10px 0; font-size: 16px; color: #333; }
                .subscription-suggestion { margin: 5px 0; font-size: 14px; color: #007BFF; }
            </style>
        </head>
        <body>
            <div class="container">
            <div class="logo-container"><a href="https://nostraddress.com" style="text-decoration:none;color:#000;"><font style="vertical-align: middle;" size="80px;">🏞️</font>&nbsp;&nbsp;<strong>NostrMedia.com</strong></a></div>
                <h1>Subscribe with Nostr + Bitcoin Lightning</h1>
                <div class="toggle-container">
                    <button class="toggle-button active" id="monthlyToggle">Monthly</button>
                    <button class="toggle-button" id="yearlyToggle">Yearly</button>
                </div>
                <table id="subscriptionTable">
                    <tr>
                        <th>Plan</th>
                        <th>Price (USD)</th>
                        <th>Subscribe</th>
                    </tr>
                    <tr data-plan="purple">
                        <td>
                            <img style="border-radius: 6px; height: 60px; width: 60px;" src="https://nostraddress.com/assets/img/purple-plan.png"/><br>Purple<br>
                            <span class="features-link" onclick="showFeatures('purple')"> (see features)</span>
                        </td>
                        <td class="price">
                            <span class="price-usd">$${pricingData.monthly.purple.toFixed(2)}</span><br>
                            <span class="price-sats">(${purpleMonthlySats} SATS)</span>
                        </td>
                        <td><button id="purpleZapButton">Zap for Purple ⚡️</button></td>
                    </tr>
                    <tr data-plan="onyx">
                        <td>
                            <img style="border-radius: 6px; height: 60px; width: 60px;" src="https://nostraddress.com/assets/img/onyx-plan.png"/><br>Onyx<br>
                            <span class="features-link" onclick="showFeatures('onyx')"> (see features)</span>
                        </td>
                        <td class="price">
                            <span class="price-usd">$${pricingData.monthly.onyx.toFixed(2)}</span><br>
                            <span class="price-sats">(${onyxMonthlySats} SATS)</span>
                        </td>
                        <td><button id="onyxZapButton">Zap for Onyx ⚡️</button></td>
                    </tr>
                </table>
                <div class="discount-input">
                    <input type="text" id="discountCode" placeholder="Enter discount code">
                    <button onclick="applyDiscount()">Apply Code</button>
                </div>
                ${discountMessage ? `<div class="discount-message">${discountMessage}</div>` : ''}
                <div class="subscription-check">
                    <p>Already subscribed? Check time remaining in subscription</p>
                    <button onclick="checkSubscriptionTime()">Check Time Remaining</button>
                    <div id="subscriptionResult" class="subscription-result"></div>
                    <div id="subscriptionSuggestion" class="subscription-suggestion"></div>
                </div>
            </div>

            <!-- Modal for Features -->
            <div id="featuresModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeModal()">&times;</span>
                    <h2 id="modalTitle"></h2>
                    <ul id="modalFeatures"></ul>
                </div>
            </div>

            <script src="https://unpkg.com/nostr-tools/lib/nostr.bundle.js"></script>
            <script src="https://nostraddress.com/assets/js/nostr-lightning.js"></script>
            <script>
                // Original pricing data (for strikethrough display)
                const originalMonthlyPricing = {
                    purple: { usd: ${originalPricing.monthly.purple}, sats: ${purpleMonthlySats} },
                    onyx: { usd: ${originalPricing.monthly.onyx}, sats: ${onyxMonthlySats} }
                };
                const originalYearlyPricing = {
                    purple: { usd: ${originalPricing.yearly.purple}, sats: ${purpleYearlySats} },
                    onyx: { usd: ${originalPricing.yearly.onyx}, sats: ${onyxYearlySats} }
                };

                // Current pricing data (updated with discounts)
                let monthlyPricing = {
                    purple: { usd: ${pricingData.monthly.purple}, sats: ${purpleMonthlySats} },
                    onyx: { usd: ${pricingData.monthly.onyx}, sats: ${onyxMonthlySats} }
                };
                let yearlyPricing = {
                    purple: { usd: ${pricingData.yearly.purple}, sats: ${purpleYearlySats} },
                    onyx: { usd: ${pricingData.yearly.onyx}, sats: ${onyxYearlySats} }
                };

                // Features for each plan
                const featuresData = {
                    purple: [
                        "100 GB storage",
                        "Image JPEG, JPG, PNG, GIF, WEBP, BMP, TIFF, HEIC, ICO uploads",
                        "Video MP4, WEBM, OGG, MOV, WMV, MKV, AVI, FLV, MPEG uploads",
                        "Zapwall (earn Bitcoin on uploads)",
                        "List, delete, search, sort files"
                    ],
                    onyx: [
                        "210 GB storage",
                        "Image SVG, PSD, JPEG, JPG, PNG, GIF, WEBP, BMP, TIFF, HEIC, ICO uploads",
                        "Video 3GP, M4V, MP4, WEBM, OGG, MOV, WMV, MKV, AVI, FLV, MPEG, 3GP, M4V uploads",
                        "Audio MP3, WAV, OGG, FLAC, AAC, M4A, WMA uploads",
                        "File ZIP, PDF, DOCX, XLSX, PPTX, ODT, ODS, TXT, RTF, CSV, STL, RAR, 7z uploads",
                        "Zapwall (earn Bitcoin on uploads)",
                        "List, delete, search, sort files"
                    ]
                };

                // Toggle button elements
                const monthlyToggle = document.getElementById('monthlyToggle');
                const yearlyToggle = document.getElementById('yearlyToggle');

                // Modal elements
                const featuresModal = document.getElementById('featuresModal');
                const modalTitle = document.getElementById('modalTitle');
                const modalFeatures = document.getElementById('modalFeatures');

                // Function to update pricing table with original price strikethrough if discounted
                function updatePricingTable(billingCycle) {
                    const pricingData = billingCycle === 'monthly' ? monthlyPricing : yearlyPricing;
                    const originalData = billingCycle === 'monthly' ? originalMonthlyPricing : originalYearlyPricing;
                    document.querySelectorAll('#subscriptionTable tr[data-plan]').forEach(row => {
                        const plan = row.getAttribute('data-plan');
                        const usdCell = row.querySelector('.price-usd');
                        const satsCell = row.querySelector('.price-sats');
                        const currentUsd = pricingData[plan].usd.toFixed(2);
                        const originalUsd = originalData[plan].usd.toFixed(2);
                        if (currentUsd < originalUsd) {
                            usdCell.innerHTML = '<span class="original-price">$' + originalUsd + '</span> $' + currentUsd;
                        } else {
                            usdCell.innerHTML = '$' + currentUsd;
                        }
                        satsCell.textContent = '(' | pricingData[plan].sats + ' SATS)';
                        // Update the data-sats-amount attribute for zap buttons
                        const button = row.querySelector('button');
                        button.setAttribute('data-sats-amount', pricingData[plan].sats);
                    });
                    if (billingCycle === 'monthly') {
                        monthlyToggle.classList.add('active');
                        yearlyToggle.classList.remove('active');
                    } else {
                        yearlyToggle.classList.add('active');
                        monthlyToggle.classList.remove('active');
                    }
                }

                // Function to show features modal
                function showFeatures(plan) {
                    modalTitle.textContent = plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan Features';
                    modalFeatures.innerHTML = '';
                    featuresData[plan].forEach(feature => {
                        const li = document.createElement('li');
                        li.textContent = feature;
                        modalFeatures.appendChild(li);
                    });
                    featuresModal.style.display = 'block';
                }

                // Function to close modal
                function closeModal() {
                    featuresModal.style.display = 'none';
                }

                // Function to apply discount code via AJAX
                async function applyDiscount() {
                    const code = document.getElementById('discountCode').value.trim();
                    const discountMessageDiv = document.querySelector('.discount-message') || document.createElement('div');
                    discountMessageDiv.className = 'discount-message';

                    if (!code) {
                        discountMessageDiv.textContent = 'Please enter a discount code.';
                        discountMessageDiv.style.color = 'red';
                        if (!document.querySelector('.discount-message')) {
                            document.querySelector('.discount-input').insertAdjacentElement('afterend', discountMessageDiv);
                        }
                        return;
                    }

                    try {
                        const response = await fetch('/validate-discount', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ code })
                        });
                        const result = await response.json();

                        if (result.success) {
                            // Update pricing data with discounted values
                            monthlyPricing = {
                                purple: { usd: result.pricing.monthly.purple, sats: result.sats.monthly.purple },
                                onyx: { usd: result.pricing.monthly.onyx, sats: result.sats.monthly.onyx }
                            };
                            yearlyPricing = {
                                purple: { usd: result.pricing.yearly.purple, sats: result.sats.yearly.purple },
                                onyx: { usd: result.pricing.yearly.onyx, sats: result.sats.yearly.onyx }
                            };
                            // Update Zap button amounts
                            document.getElementById('purpleZapButton').setAttribute('data-sats-amount', result.sats.monthly.purple);
                            document.getElementById('onyxZapButton').setAttribute('data-sats-amount', result.sats.monthly.onyx);
                            // Refresh pricing table
                            updatePricingTable(monthlyToggle.classList.contains('active') ? 'monthly' : 'yearly');
                            // Show success message
                            discountMessageDiv.textContent = result.message;
                            discountMessageDiv.style.color = 'green';
                        } else {
                            discountMessageDiv.textContent = result.message;
                            discountMessageDiv.style.color = 'red';
                        }
                        if (!document.querySelector('.discount-message')) {
                            document.querySelector('.discount-input').insertAdjacentElement('afterend', discountMessageDiv);
                        }
                    } catch (error) {
                        console.error('Error applying discount:', error);
                        discountMessageDiv.textContent = 'Error applying discount code. Please try again.';
                        discountMessageDiv.style.color = 'red';
                        if (!document.querySelector('.discount-message')) {
                            document.querySelector('.discount-input').insertAdjacentElement('afterend', discountMessageDiv);
                        }
                    }
                }

                // Function to check subscription time remaining via Nostr authentication
                async function checkSubscriptionTime() {
                    const resultDiv = document.getElementById('subscriptionResult');
                    const suggestionDiv = document.getElementById('subscriptionSuggestion');

                    // Clear previous results
                    resultDiv.textContent = '';
                    suggestionDiv.textContent = '';

                    if (!window.nostr || !window.nostr.signEvent) {
                        resultDiv.textContent = 'Nostr extension not found. Please install a Nostr-compatible extension (e.g., Alby or nos2x) to check your subscription.';
                        resultDiv.style.color = 'red';
                        return;
                    }

                    try {
                        // Create a simple event to sign for authentication
                        const event = {
                            kind: 1,
                            created_at: Math.floor(Date.now() / 1000),
                            tags: [],
                            content: 'Checking subscription status for NostrMedia.com'
                        };
                        const signedEvent = await window.nostr.signEvent(event);
                        const pubkey = signedEvent.pubkey;

                        if (!pubkey) {
                            resultDiv.textContent = 'Failed to retrieve public key from Nostr extension.';
                            resultDiv.style.color = 'red';
                            return;
                        }

                        // Send pubkey to server to check subscription
                        const response = await fetch('/check-subscription', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ pubkey })
                        });
                        const result = await response.json();

                        if (result.success) {
                            resultDiv.textContent = result.message;
                            resultDiv.style.color = 'green';
                            if (result.suggestion) {
                                suggestionDiv.textContent = result.suggestion;
                                if (result.isNearExpiry) {
                                    // Highlight the current plan's Zap button if near expiry
                                    const plan = result.plan;
                                    const buttonId = plan === 'purple' ? 'purpleZapButton' : 'onyxZapButton';
                                    const button = document.getElementById(buttonId);
                                    if (button) {
                                        button.style.backgroundColor = '#FF4500'; // Highlight with orange
                                        button.style.animation = 'pulse 2s infinite';
                                    }
                                }
                            }
                        } else {
                            resultDiv.textContent = result.message;
                            resultDiv.style.color = 'red';
                        }
                    } catch (error) {
                        console.error('Error checking subscription:', error);
                        resultDiv.textContent = 'Error checking subscription. Please ensure your Nostr extension is active and try again.';
                        resultDiv.style.color = 'red';
                    }
                }

                // Event listeners for toggle buttons
                monthlyToggle.addEventListener('click', () => updatePricingTable('monthly'));
                yearlyToggle.addEventListener('click', () => updatePricingTable('yearly'));

                // Close modal when clicking outside of it
                window.addEventListener('click', function(event) {
                    if (event.target === featuresModal) {
                        closeModal();
                    }
                });

                // Initialize zap targets with dynamic data-sats-amount updates
                document.getElementById('purpleZapButton').setAttribute('data-npub', 'npub18jnd0ssw2v882c0t9xsxdhafsah8j86prdfpsld8kv2dcjx43r8qke59kc');
                document.getElementById('purpleZapButton').setAttribute('data-relays', 'wss://relay.damus.io,wss://relay.primal.net');
                document.getElementById('purpleZapButton').setAttribute('data-plan', 'purple');
                document.getElementById('purpleZapButton').setAttribute('data-sats-amount', '${purpleMonthlySats}');

                document.getElementById('onyxZapButton').setAttribute('data-npub', 'npub18jnd0ssw2v882c0t9xsxdhafsah8j86prdfpsld8kv2dcjx43r8qke59kc');
                document.getElementById('onyxZapButton').setAttribute('data-relays', 'wss://relay.damus.io,wss://relay.primal.net');
                document.getElementById('onyxZapButton').setAttribute('data-plan', 'onyx');
                document.getElementById('onyxZapButton').setAttribute('data-sats-amount', '${onyxMonthlySats}');

                nostrZap.initTargets('#purpleZapButton, #onyxZapButton');

                // Ensure initial update of pricing table to sync data-sats-amount
                updatePricingTable('monthly');
            </script>
            <script src="https://www.unpkg.com/nostr-login@latest/dist/unpkg.js" data-perms="sign_event:1,nip04_encrypt,sign_event:24242" data-methods="connect,extension,local" data-dark-mode="false" data-title="Login with Nostr" data-description="Use a login method with Nostr to subscribe."></script>
        </body>
        </html>
    `;
}
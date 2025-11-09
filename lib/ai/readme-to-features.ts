import Anthropic from '@anthropic-ai/sdk';

// System prompt for README to features extraction
const README2FEATURES_SYSTEM_PROMPT = `You are a feature claim analyzer. Extract high-level, verifiable feature claims from README documentation and convert them into testable functional requirements.

WHAT TO EXTRACT:
- Core functionality that makes the project unique and useful
- Differentiating features that distinguish this project from alternatives
- Explicit capabilities and integrations
- Negative claims if verifiable ("no dependencies", "works offline", "no configuration required")

WHAT TO SKIP:
- Marketing language ("blazingly fast", "enterprise-grade", "production-ready")
- Table-stakes features ("mobile responsive", "dark mode", "logging")
- Roadmap/planned features marked "coming soon" or "planned"
- Installation instructions and setup steps
- Performance claims without measurable thresholds
- Sub-features and implementation details

EXTRACTION RULES:
1. Focus on high-level features only ("user authentication" not "OAuth, SAML, 2FA")
2. For vague scope, use general requirements ("supports multiple databases" → "supports at least 2 databases")
3. Prioritize features that answer: "Why would someone use this project?"
4. Extract 5-10 core features maximum

FUNCTIONAL REQUIREMENTS:
Choose format based on README specificity:
- Acceptance criteria: "Given [context], when [action], then [outcome]" (when README provides detail)
- Simple assertion: "[Component] exists and functions" (when README is vague)

OUTPUT FORMAT:
\`\`\`json
{
  "features": [
    {
      "id": "F1",
      "claim": "[exact quote or close paraphrase]",
      "requirement": "[testable functional requirement]",
      "verification_hint": "[brief guidance for automated testing]"
    }
  ]
}
\`\`\`

Be selective. Only extract features that a verification agent could meaningfully test in a sandbox environment within 5-10 minutes. Prioritize quality over quantity.`;

export interface Feature {
  id: string;
  claim: string;
  requirement: string;
  verification_hint: string;
}

export interface FeaturesExtractionResult {
  features: Feature[];
}

/**
 * Fetch README content from GitHub repository
 */
async function fetchReadme(githubUrl: string): Promise<string> {
  // Parse GitHub URL to extract owner and repo
  const urlMatch = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!urlMatch) {
    throw new Error('Invalid GitHub URL');
  }

  const [, owner, repo] = urlMatch;
  const repoName = repo.replace(/\.git$/, '');

  // Try multiple README filename variations
  const readmeFilenames = ['README.md', 'readme.md', 'Readme.md', 'README'];

  for (const filename of readmeFilenames) {
    try {
      const response = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repoName}/main/${filename}`
      );

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      // Try next filename
      continue;
    }
  }

  // Try master branch if main didn't work
  for (const filename of readmeFilenames) {
    try {
      const response = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repoName}/master/${filename}`
      );

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      // Try next filename
      continue;
    }
  }

  throw new Error('README file not found in repository');
}

/**
 * Extract features from README content using Claude
 */
export async function extractFeaturesFromReadme(
  githubUrl: string
): Promise<FeaturesExtractionResult> {
  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Fetch README content
  const readmeContent = await fetchReadme(githubUrl);

  if (!readmeContent || readmeContent.trim().length === 0) {
    return { features: [] };
  }

  // Call Claude with the README2Features prompt
  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: README2FEATURES_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract features from this README:\n\n${readmeContent}`,
      },
    ],
  });

  // Parse the response
  const responseText = message.content[0].type === 'text'
    ? message.content[0].text
    : '';

  // Extract JSON from the response (handling markdown code blocks)
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                   responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                   [null, responseText];

  const jsonContent = jsonMatch[1] || responseText;

  try {
    const result = JSON.parse(jsonContent.trim()) as FeaturesExtractionResult;
    return result;
  } catch (error) {
    console.error('Failed to parse features extraction result:', error);
    console.error('Response text:', responseText);
    return { features: [] };
  }
}

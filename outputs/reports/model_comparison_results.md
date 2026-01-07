# Model Comparison Results

**Date:** 2026-01-07 13:39

## Models Tested

| Model | Description |
|-------|-------------|
| qwen3-32b | Qwen 3 32B - Alibaba's multilingual model |
| llama-3.3-70b-versatile | Llama 3.3 70B - Meta's versatile model |
| llama-3.1-8b-instant | Llama 3.1 8B - Meta's fast, efficient model |

## Results Summary

| Model | Items | Avg Latency | Avg Sent Len | % Long Sent | LIX |
|-------|-------|-------------|--------------|-------------|-----|
| qwen3-32b | 5 | 0.96s | 8.7 | 3.6% | 37.5 |
| llama-3.3-70b-versatile | 5 | 0.21s | 10.0 | 0.0% | 40.9 |
| llama-3.1-8b-instant | 5 | 0.25s | 12.0 | 5.0% | 37.3 |

## 🏆 Best Model: **llama-3.1-8b-instant**

Lowest average LIX score: 37.3

## Sample Outputs

### qwen3-32b

**Source:** The Department of Justice provides for interested citizens access to nearly the entire body of current federal law at no cost via the Internet.

**Output:** <think>
Okay, let's tackle this. The user wants me to rewrite the given text in plain English. First, I need to understand the original sentence. It says the Department of Justice gives interested citizens access to almost all current federal laws for free online.

Now, applying the rules. Short sentences, active voice. The original is a bit long. Let me break it down. "The Department of Justice provides for interested citizens access..." Maybe start with "The Department of Justice gives free online access..." That's active voice. 

Avoid passive constructions. The original uses "provides for," which is a bit passive. Changing to "gives" makes it active. 

Avoid negatives. The original doesn't have any, so that's good. 

Explain difficult terms if necessary. "Body of current federal law" might be tricky. Maybe "all current federal laws" is simpler. 

Use the same word for the same concept. "Department of Justice" is mentioned once, so that's consistent. 

Keep the meaning. The key points are free access, online, to nearly all federal laws for interested citizens. 

Putting it together: "The Department of Justice gives free online access to nearly all current federal laws for interested citizens." Check sentence length: 14 words. Good. Active voice. No negatives. Explained the term. Same concepts. Meaning intact. That should work.
</think>

The Department of Justice gives free online access to nearly all current federal laws for interested citizens.

**Metrics:** 33 sentences, avg 7.1 words, LIX=35.0

---

### llama-3.3-70b-versatile

**Source:** The Department of Justice provides for interested citizens access to nearly the entire body of current federal law at no cost via the Internet.

**Output:** The Department of Justice offers free access to federal laws on the Internet.

**Metrics:** 1 sentences, avg 13.0 words, LIX=43.8

---

### llama-3.1-8b-instant

**Source:** The Department of Justice provides for interested citizens access to nearly the entire body of current federal law at no cost via the Internet.

**Output:** The Department of Justice offers free access to federal laws online.

Here's how it works:

- The Department of Justice makes federal laws available online.
- You can access these laws for free.
- This includes most current federal laws.
- You can find them on the internet.

**Metrics:** 5 sentences, avg 9.0 words, LIX=33.4

---


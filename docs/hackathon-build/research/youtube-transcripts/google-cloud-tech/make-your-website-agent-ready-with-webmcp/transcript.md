---
title: Make your website agent ready with WebMCP
channel: Google Cloud Tech
date: 2026-08-17
url: "https://www.youtube.com/watch?v=FARxSG_EY98"
cover: imgs/cover.jpg
description: "Join Gemini Enterprise Agent Ready (GEAR) for the latest agent resources here. → https://goo.gle/3Srblgl Access the source code on GitHub → https://goo.gle/4g8TC5t"
language: en-US
---

# Make your website agent ready with WebMCP

Join Gemini Enterprise Agent Ready (GEAR) for the latest agent resources here. → https://goo.gle/3Srblgl Access the source code on GitHub → https://goo.gle/4g8TC5t

Hi, I'm Hugo, a Google Developer Expert in AI, and I'll talk to you about Web MCPs, a technology that's reshaping how AI agents interact with the web. Let's start with an example. Imagine you run an eCommerce site. More and more customers are delegating tasks to AI agents to do things for them. Find a product, compare options, or place an order.

To stay relevant, your site can't just be human-readable; it has to be machine- accessible. You want to be a website that agents can actually use reliably at scale. And this is where WebMCP comes in. Web MCP lets you declare agent-ready interfaces directly inside your web page. So when your website is loaded, a couple of tools are loaded and exposed together with it to the AI agents.

And it behaves like a standard MCP, but instead of running on a separate server, it lives in the page itself, exposed through a simple browser API. With Web MCP, when an agent lands in a page, it doesn't have to scrape the HTML or guess. It sees a clean set of predefined tools that they can use to manipulate the website. For our eCommerce example, the home page could expose tools such as search products, get categories, and filter, while the product page could expose add to cart or get similar products. And the agent calls them like any MCP tool, but the tools are contextual to the page the agent's navigating.

And there is no need to connect to anything beyond the web page. And having this on your website makes a huge difference because navigation becomes much faster and much cheaper in terms of tokens. So let me show you how this looks like in practice. To demonstrate this, I built a small example called Happy Coffee, a fake internal data developer portal for a coffee warehouse. It's the kind of tool most companies have for managing their data pipelines, quality checks, and cost monitoring, all in one place.

This is a React app, and it's fully WebMCP enabled using the imperative API. In this example, I'm using a Chrome extension to ask Gemini to search for a dataset, analyze the quality checks, and give me a summary of what's going on. This is a sequence of actions that requires a contextual understanding of the website and what to look for. And notice how fast Gemini does it properly. And all of this using a tiny fraction of the tokens a screenshot-based agent would burn in the process.

In this case, it used a few MCP tools I defined, but let me zoom in on the search global catalog so you can understand how it works. To create a WebMCP tool, you basically need to register it, describe what it does, declare its inputs and outputs, and mark required fields. And that's it. The agent now has a precise typed contract for that capability on our website. And all the tools are contextual to the page.

The agent has everything they need on the page they are loading. There's one more thing I'm really excited about, and it's the reason I chose the developer portal for this demo. WebMCP isn't just for remote agents hitting APIs and interacting with your website. It also unlocks local agents working with WebUIs, which enables some very powerful workflows. For example, on a typical data development flow, before you merge a pipeline to production, you run a staging execution to make sure the dataset materializes correctly.

And what we are seeing is that developers are calling agents on CLIs to do the whole development for them. But once the dataset is ready, they want to have visual feedback on the execution going on. The logs, the lineage, sample data, and so on. And WebUIs are the best format to provide such feedback. So, I implemented a way to open my local terminal inside my web portal, and I will ask Gemini to develop a data transformation for me.

However, I used WebMCP to expose the developer portal to the Gemini model I'm interacting. So, the code is being developed by Gemini on my local machine. And once the code is ready, Gemini is going to trigger a staging execution for the dataset, and they will navigate to the pipeline page to enable me to follow that execution. And then, I can inspect the results myself. I can see the logs, I can see a sample of the data, and so on.

So, notice that after my commands, the model developed the dataset, and it's now controlling my browser to check the execution. And it's the type of solution that really accelerates development workflows. In my case, I'm monitoring the execution, but in practice, you can just expose the WebMCP tools and let it flow autonomously. If you want, you can just have the visual feedback. And yeah, that's WebMCP.

It makes agentic-driven web navigation fast and cost-efficient. And it gives you, as a builder, real control of how agents experience your product. The full source code for this demo and an article on WebMCPs are linked in the description below. And thanks for watching, and I'll see you next time!

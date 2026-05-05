export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
  },
  maxDuration: 60,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;
    
    // First call - with web search tool
    const response1 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body)
    });
    const data1 = await response1.json();
    
    // Check if model wants to use tools
    if (data1.stop_reason === 'tool_use') {
      // Get tool results and continue conversation
      const toolUseBlocks = data1.content.filter(b => b.type === 'tool_use');
      const toolResults = toolUseBlocks.map(block => ({
        type: 'tool_result',
        tool_use_id: block.id,
        content: block.input?.query ? `Search results for: ${block.input.query}` : 'No results'
      }));

      const response2 = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          ...body,
          messages: [
            ...body.messages,
            { role: 'assistant', content: data1.content },
            { role: 'user', content: toolResults }
          ]
        })
      });
      const data2 = await response2.json();
      res.status(200).json(data2);
    } else {
      res.status(200).json(data1);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
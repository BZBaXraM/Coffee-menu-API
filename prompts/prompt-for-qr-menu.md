Не трогать текущую ингрегацию, только надо всё передать на кофе меню (только кофе и всё, что связанно с ним - напитки и т.д (не алкаголь!)); УДАЛИТЬ БД, КОНЕЧНО! 


По умолчанию поставить Whatsapp номер это: +994519923208

Заменить z.ai на grog - const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "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",
  baseURL: "https://api.groq.com/openai/v1",
});
 
 const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function askQuestion(query: string) {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

const messages: any = [];

async function main() {
    while (true) {
        const userInput: any = await askQuestion("You: ");

        if (userInput.toLowerCase().trim() === "stop") {
            console.log("Goodbye!");
            rl.close();
            break;
        }

        messages.push({
            role: "user",
            content: userInput,
        });

        const response = await client.responses.create({
            model: "llama-3.3-70b-versatile",
            input: messages,
        });

        const assistantMessage = response.output_text;
        messages.push(...response.output);

        Promise
        console.log(`Assistant: ${assistantMessage}`);
    }
}

main();

Собрать клиент-части  на react + taillwindcss

Sample (хочу такой дизайн): https://live.menucardstudio.com/page/JTW4W6ZF 
В папке samples есть ещё фотка всего - coffee-menu.jpeg
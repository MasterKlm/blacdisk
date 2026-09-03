import figlet from 'figlet';
import chalk from 'chalk';
export async function renderBlacdiskLogo() {
    return new Promise((resolve, reject) => figlet.text('Blacdisk', { font: 'ANSI Shadow' }, (err, data) => {
        console.log(chalk.hex('#FFFFFF')(data));
        console.log(chalk.hex('#DC7358')("Running on CLAUDE CODE"));
        resolve("");
    }));
}
//# sourceMappingURL=maskot.js.map
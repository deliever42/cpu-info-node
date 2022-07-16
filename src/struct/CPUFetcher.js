const axios = require('axios'),
    { JSDOM } = require('jsdom'),
    puppeteer = require('puppeteer'),
    { writeFileSync } = require('node:fs'),
    { resolve } = require('node:path');

module.exports = class CPUInfo {
    /** @type {string} @private */
    #url = 'https://www.cpubenchmark.net/cpu_list.php';

    /** @param {boolean} [write] @returns {Promise<import("../../types/IPartialCPU").default[]>} */
    async fetchAll(write) {
        const response = await axios.get(this.#url),
            { window } = new JSDOM(response.data),
            $ = require('jquery')(window),
            resolved = [];

        let raw = Object.values($('#cputable > tbody').children());

        raw.pop();
        raw.pop();

        for (const _raw of raw) {
            resolved.push({
                name: $('#' + _raw.id)
                    .children()
                    .children('a')
                    .html(),
                link: `https://www.cpubenchmark.net/cpu.php?id=${_raw.id.slice(3)}`,
            });
        }

        if (write) {
            writeFileSync(
                resolve(process.cwd(), 'cpu_list.json'),
                JSON.stringify(resolved, null, 4),
            );
        }

        return resolved;
    }

    /** @param {string} name @returns {Promise<import("../../types/ICPU").default>} */
    async fetch(name) {
        const cpu = await this.find((_name) => _name.toLowerCase().includes(name.toLowerCase()));

        if (cpu === undefined) {
            throw new ReferenceError('No such processor found');
        }

        try {
            const browser = await puppeteer.launch(),
                page = await browser.newPage();

            await page.goto(cpu.link);

            const [a] = await page.$x(
                    `//*[@id="main_content"]/div[3]/div[2]/div[2]/div[1]/div/div[1]/div[3]/p[1]`,
                ),
                [b] = await page.$x(
                    `//*[@id="main_content"]/div[3]/div[2]/div[2]/div[1]/div/div[1]/div[3]/p[2]`,
                ),
                [c] = await page.$x(
                    `//*[@id="main_content"]/div[3]/div[2]/div[2]/div[1]/div/div[1]/div[3]/p[3]`,
                ),
                [d] = await page.$x(
                    `//*[@id="main_content"]/div[3]/div[2]/div[2]/div[1]/div/div[1]/div[3]/p[4]`,
                ),
                [e] = await page.$x(
                    `//*[@id="main_content"]/div[3]/div[2]/div[2]/div[1]/div/div[1]/div[3]/p[6]`,
                ),
                [f] = await page.$x(
                    `//*[@id="main_content"]/div[3]/div[2]/div[2]/div[1]/div/div[1]/div[3]/p[5]`,
                ),
                [g] = await page.$x(
                    `//*[@id="main_content"]/div[3]/div[2]/div[2]/div[1]/div/div[1]/div[4]/p[2]`,
                ),
                [h] = await page.$x(
                    `//*[@id="main_content"]/div[3]/div[2]/div[2]/div[1]/div/div[2]/span[1]`,
                );

            const platform = (await (await a.getProperty('textContent')).jsonValue()).slice(7),
                socket = (await (await b.getProperty('textContent')).jsonValue()).slice(8),
                core = (await (await f.getProperty('textContent')).jsonValue())
                    .trim()
                    .split(/ +/)[1],
                threads = (await (await f.getProperty('textContent')).jsonValue())
                    .trim()
                    .split(/ +/)[3],
                clock_speed = (await (await c.getProperty('textContent')).jsonValue()).slice(12),
                turbo_speed = (await (await d.getProperty('textContent')).jsonValue()).slice(13),
                tdp = (await (await e.getProperty('textContent')).jsonValue()).slice(13),
                release = (await (await g.getProperty('textContent')).jsonValue()).slice(26),
                perf_3d = await (await h.getProperty('textContent')).jsonValue();

            const data = {
                name: cpu.name,
                platform,
                socket,
                core,
                threads,
                clock_speed,
                turbo_speed,
                tdp,
                release,
                perf_3d,
                link: cpu.link,
            };

            await browser.close();

            return data;
        } catch {
            throw new ReferenceError('An error occured while fetching the processor');
        }
    }

    /** @param {(name: string, link: string) => boolean} fn */
    async find(fn) {
        const cpus = await this.fetchAll();
        return cpus.find((cpu) => fn(cpu.name, cpu.link));
    }

    /** @param {(name: string, link: string) => boolean} fn */
    async filter(fn) {
        const cpus = await this.fetchAll();
        return cpus.filter((cpu) => fn(cpu.name, cpu.link));
    }
};

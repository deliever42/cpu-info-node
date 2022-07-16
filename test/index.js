const fetcher = new (require('../src/index'))();

(async () => {
    console.log(await fetcher.fetch('i7-12700k'));
})();

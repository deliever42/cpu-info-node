const fetcher = new (require('../src/index'))();

(async () => {
    console.log(await fetcher.fetch('i9-10850k'));
})();

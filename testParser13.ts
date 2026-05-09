const processedTopics = [
    { chapterId: 'c1', name: 'Topic 1', status: 'WEAK' },
];

const subTopics = new Set(['Topic 1', 'Topic 2']);

const newSubTopics: any[] = [];
subTopics.forEach(subName => {
    // BUG HERE!
    // If it exists in processedTopics, it is SKIPPED entirely, and we lose the original topic!
    // Wait, the logic is:
    // return newSubTopics;
    // So if "Topic 1" exists, it's NOT pushed to newSubTopics.
    // So newSubTopics only contains "Topic 2".
    // And we return newSubTopics! "Topic 1" is lost!

    const exists = processedTopics.some(t => t.chapterId === 'c1' && t.name === subName);
    if (!exists) {
        newSubTopics.push({ name: subName });
    }
});
console.log(newSubTopics); // only Topic 2

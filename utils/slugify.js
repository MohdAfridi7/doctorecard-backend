const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
};

module.exports = generateSlug;
export const load = ({ url }) => {
  const switchValue = url.searchParams.get("switch");
  const query = url.searchParams.get("q");

  return {
    query,
    switch: switchValue,
    time: new Date(),
  };
};

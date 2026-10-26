
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
  Button,
} from "@mui/material";

const categories = [
  { label: "All places", value: "all", apiCategory: "tourism.sights" },
  { label: "Museums", value: "museums", apiCategory: "entertainment.museum" },
  { label: "Historic sites", value: "historic", apiCategory: "tourism.sights" },
  { label: "Nature", value: "nature", apiCategory: "natural" },
];

const icons = ["🏛️", "🌿", "🏰", "🕌", "🏞️"];

function cleanDestination(value) {
  if (typeof value !== "string") return "";

  let destination = value.trim();

  if (!destination || !/[a-zA-Z]/.test(destination)) return "";
  if (/^\d+\s*[\+\-*/]\s*\d+$/.test(destination)) return "";

  destination = destination
    .replace(
      /^(?:please\s+)?(?:show\s+me\s+)?(?:tourist attractions|tourist places|places to visit|things to do|travel guide|attractions|tourism|explore|landmarks|museums|historic sites|historical places|nature attractions|tourist spots|what to see)\s+(?:(?:in|at|around|for)\s+)?/i,
      ""
    )
    .trim();

  return destination && /[a-zA-Z]/.test(destination) ? destination : "";
}

function getSearchDestination(props) {
  const queryProps = props?.queryProps;
  const searchData = props?.searchData;

  const candidates = [
    queryProps?.city,
    queryProps?.destination,
    queryProps?.location,
    queryProps?.query,
    searchData?.destination,
    searchData?.city,
    searchData?.location,
    searchData?.query,
    searchData?.searchQuery,
    searchData?.name,
    props?.searchQuery,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const cleaned = cleanDestination(candidate);
      if (cleaned) return cleaned;
    }

    if (candidate && typeof candidate === "object") {
      for (const value of [
        candidate.city,
        candidate.destination,
        candidate.location,
        candidate.query,
        candidate.searchQuery,
        candidate.name,
      ]) {
        const cleaned = cleanDestination(value);
        if (cleaned) return cleaned;
      }
    }
  }

  if (Array.isArray(searchData)) {
    for (const item of searchData) {
      const candidate =
        typeof item === "string"
          ? item
          : item?.destination ||
            item?.city ||
            item?.location ||
            item?.query ||
            item?.name;

      const cleaned = cleanDestination(candidate);
      if (cleaned) return cleaned;
    }
  }

  return "";
}

function NewComponent(props) {
  const incomingSearch = getSearchDestination(props);

  const [city, setCity] = useState("New Delhi, India");
  const [category, setCategory] = useState("all");
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const lastSearch = useRef("");
  const requestNumber = useRef(0);
  const notifiedLoaded = useRef(false);

  const API_URL = import.meta.env.PROD
    ? props?.deployedBackendURL || ""
    : "http://127.0.0.1:3001";

  useEffect(() => {
    if (!notifiedLoaded.current) {
      notifiedLoaded.current = true;
      props?.messageHandlers?.componentLoaded?.();
    }
  }, [props?.messageHandlers]);

  async function searchPlaces(
    destinationText,
    selectedCategory = category,
    force = false
  ) {
    const destination = cleanDestination(destinationText);

    if (!destination) {
      setError(
        "No destination was received. Search for a place such as 'tourist attractions in Jaipur' using the top HyperDart search bar."
      );
      setSearched(false);
      return;
    }

    const selectedFilter =
      categories.find((item) => item.value === selectedCategory) ||
      categories[0];

    const searchKey = `${destination}|${selectedFilter.value}`;

    if (!force && lastSearch.current === searchKey && !error) return;

    lastSearch.current = searchKey;
    const currentRequest = ++requestNumber.current;

    setCity(destination);
    setCategory(selectedFilter.value);
    setLoading(true);
    setError("");
    setSearched(true);
    setPlaces([]);

    try {
      if (!API_URL) {
        throw new Error(
          "The deployed tourism backend URL is not configured."
        );
      }

      const baseURL = API_URL.replace(/\/+$/, "");
      const url = new URL(`${baseURL}/api/tourism`);

      url.searchParams.set("city", destination);
      url.searchParams.set("category", selectedFilter.apiCategory);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to retrieve tourist attractions."
        );
      }

      let results = Array.isArray(data?.places) ? data.places : [];

      if (selectedFilter.value === "historic") {
        const terms = [
          "archaeological",
          "historic",
          "monument",
          "fort",
          "tomb",
          "ruins",
          "palace",
          "castle",
          "memorial",
          "heritage",
        ];

        results = results.filter((place) => {
          const text =
            `${place.name || ""} ${place.category || ""} ${
              place.description || ""
            }`.toLowerCase();

          return terms.some((term) => text.includes(term));
        });
      }

      if (currentRequest !== requestNumber.current) return;

      setPlaces(results);

      if (results.length === 0) {
        setError(
          `No attractions found for ${destination}. Try another destination or category.`
        );
      }
    } catch (err) {
      if (currentRequest !== requestNumber.current) return;

      console.error("Tourism search failed:", err);
      setPlaces([]);
      setError(
        err.message ||
          "Could not connect to the tourism backend. Check that it is running."
      );
    } finally {
      if (currentRequest === requestNumber.current) {
        setLoading(false);
      }
    }
  }

  // Load a default destination on first open.
  useEffect(() => {
    searchPlaces("New Delhi, India", "all", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load a destination received from HyperDart's top search.
  useEffect(() => {
    if (!incomingSearch) return;

    searchPlaces(incomingSearch, category, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingSearch]);

  function handleCategoryChange(item) {
    if (item.value === category && !error) return;
    searchPlaces(city, item.value, true);
  }

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1100,
        mx: "auto",
        p: { xs: 2, md: 3 },
        boxSizing: "border-box",
        color: "#172033",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Hero */}
      <Box
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: 4,
          color: "white",
          background:
            "linear-gradient(130deg, #102a43 0%, #176b65 60%, #64a88c 100%)",
          mb: 4,
        }}
      >
        <Typography variant="overline" sx={{ letterSpacing: 3 }}>
          YOUR NEXT ADVENTURE STARTS HERE
        </Typography>

        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            mt: 1,
            mb: 1,
            fontSize: { xs: 30, md: 42 },
          }}
        >
          Explore beyond the ordinary.
        </Typography>

        <Typography sx={{ opacity: 0.9 }}>
          Discover landmarks, culture and hidden gems worth the journey.
        </Typography>
      </Box>

      {/* Categories */}
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
        Find your kind of adventure
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 4 }}
      >
        {categories.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            clickable
            color={category === item.value ? "primary" : "default"}
            variant={category === item.value ? "filled" : "outlined"}
            onClick={() => handleCategoryChange(item)}
            sx={
              category === item.value
                ? { bgcolor: "#f45d3e", color: "#fff" }
                : {}
            }
          />
        ))}
      </Stack>

      {error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {error}
          {!loading && (
            <Button
              size="small"
              onClick={() => searchPlaces(city, category, true)}
              sx={{ ml: 1 }}
            >
              Retry
            </Button>
          )}
        </Alert>
      )}

      {/* Results heading */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 2,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, overflowWrap: "anywhere" }}
          >
            Places to explore in {city}
          </Typography>

          <Typography color="text.secondary" variant="body2">
            {loading
              ? "Searching nearby attractions..."
              : `${places.length} ${
                  places.length === 1 ? "place" : "places"
                } found`}
          </Typography>
        </Box>

        <Chip label="TRAVEL DISCOVERY" variant="outlined" />
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>
            Finding places worth your visit...
          </Typography>
        </Box>
      ) : places.length > 0 ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {places.map((place, index) => (
            <Card
              key={place.place_id || `${place.name}-${index}`}
              elevation={0}
              sx={{
                border: "1px solid #e4e9ed",
                borderRadius: 4,
                overflow: "hidden",
                transition: "transform 180ms, box-shadow 180ms",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 28px rgba(20,40,60,0.12)",
                },
              }}
            >
              <Box
                sx={{
                  minHeight: 145,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 56,
                  background:
                    index % 2
                      ? "linear-gradient(135deg, #f4e6d1, #f5f0e6)"
                      : "linear-gradient(135deg, #d8ebe6, #edf4ef)",
                }}
              >
                {icons[index % icons.length]}
              </Box>

              <CardContent sx={{ p: 2.5 }}>
                <Chip
                  size="small"
                  label={
                    place.category?.split(",").pop()?.trim() ||
                    "Attraction"
                  }
                  sx={{ mb: 1.5, maxWidth: "100%" }}
                />

                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, mb: 1, overflowWrap: "anywhere" }}
                >
                  {place.name || "Local attraction"}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5, minHeight: 40 }}
                >
                  {place.description ||
                    "Discover this landmark and learn more about the destination."}
                </Typography>

                {place.address && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2, overflowWrap: "anywhere" }}
                  >
                    📍 {place.address}
                  </Typography>
                )}

                {place.lat != null && place.lon != null && (
                  <Button
                    component="a"
                    href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="small"
                    sx={{ color: "#e16b45", borderColor: "#e16b45" }}
                  >
                    View on Map
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        searched && (
          <Box
            sx={{
              textAlign: "center",
              py: 5,
              px: 2,
              border: "1px dashed #cbd5e1",
              borderRadius: 4,
            }}
          >
            <Typography variant="h2" sx={{ mb: 1 }}>
              🧭
            </Typography>

            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              No attractions to display
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Try another destination or select a different category.
            </Typography>

            <Button
              variant="outlined"
              sx={{ mt: 2 }}
              onClick={() => searchPlaces("New Delhi, India", category, true)}
            >
              Explore Delhi
            </Button>
          </Box>
        )
      )}

      {/* Footer */}
      <Box
        sx={{
          mt: 4,
          p: 2,
          borderRadius: 3,
          bgcolor: "#f1f6f4",
          textAlign: "center",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Travel thoughtfully. Discover something extraordinary.
        </Typography>
      </Box>
    </Box>
  );
}

export default NewComponent;

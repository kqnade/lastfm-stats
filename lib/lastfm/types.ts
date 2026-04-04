export type Period = "7day" | "1month" | "3month" | "6month" | "12month" | "overall";
export type Theme = "dark" | "light" | "transparent";

// Last.fm API raw types
export interface LastfmImage {
  "#text": string;
  size: "small" | "medium" | "large" | "extralarge" | "";
}

export interface LastfmTrack {
  name: string;
  artist: {
    name: string;
    url: string;
  };
  image: LastfmImage[];
  playcount: string;
  url: string;
  "@attr"?: {
    rank: string;
  };
}

export interface LastfmArtist {
  name: string;
  mbid: string;
  playcount: string;
  url: string;
  image: LastfmImage[];
  "@attr"?: {
    rank: string;
  };
}

export interface LastfmUserInfo {
  name: string;
  playcount: string;
  registered: {
    "#text": string;
    unixtime: string;
  };
  image: LastfmImage[];
  url: string;
}

export interface LastfmWeeklyTrackChart {
  track: Array<{
    name: string;
    artist: {
      "#text": string;
      mbid: string;
    };
    playcount: string;
    url: string;
  }>;
  "@attr": {
    from: string;
    to: string;
    user: string;
  };
}

// Processed types used in SVG rendering
export interface ProcessedTrack {
  rank: number;
  name: string;
  artist: string;
  playcount: number;
  imageUrl: string;
  imageBase64: string | null;
  loved: boolean;
  url: string;
}

export interface ProcessedArtist {
  rank: number;
  name: string;
  playcount: number;
  imageUrl: string;
  imageBase64: string | null;
  url: string;
}

export interface ProcessedStats {
  username: string;
  totalScrobbles: number;
  weeklyScrobbles: number;
  monthlyScrobbles: number;
  registeredDate: string;
  avatarUrl: string;
  avatarBase64: string | null;
}

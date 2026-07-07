export function YoutubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
      <iframe
        className="h-full w-full"
        src={`https://www.youtube.com/embed/${videoId}`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

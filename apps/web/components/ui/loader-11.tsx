export default function Loader() {
  return (
    <>
      <style>{`
        .loader-sharingon {
          width: 5em;
          height: 5em;
          background-color: #e50000;
          border: 4px solid black;
          animation: rot 1s ease-in-out infinite;
          border-radius: 50%;
          position: relative;
        }

        .loader-ring {
          position: absolute;
          content: "";
          left: 50%;
          top: 50%;
          width: 2.5em;
          height: 2.5em;
          border: 3px solid rgba(110, 13, 13, 0.5);
          transform: translate(-50%,-50%);
          border-radius: 50%;
        }

        .loader-to, .loader-circle {
          position: absolute;
          content: "";
          width: 0.8em;
          height: 0.8em;
          background-color: black;
          border-radius: 50%;
        }

        .loader-to:nth-child(1) {
          top: -0.4em;
          left: 50%;
          transform: translate(-40%);
        }

        .loader-to:nth-child(1)::before {
          content: "";
          position: absolute;
          top: -0.4em;
          right: -0.2em;
          width: 1em;
          height: 0.8em;
          box-sizing: border-box;
          border-left: 12px solid black;
          border-radius: 100% 0 0;
        }

        .loader-to:nth-child(2) {
          bottom: 0.4em;
          left: -0.3em;
          transform: rotate(-120deg);
        }

        .loader-to:nth-child(3) {
          bottom: 0.4em;
          right: -0.3em;
          transform: rotate(120deg);
        }

        .loader-circle {
          top: 50%;
          left: 50%;
          transform: translate(-50%,-50%);
          box-shadow: 0 0 15px 1px rgba(0,0,0,0.5);
          width: 0.9em;
          height: 0.9em;
        }

        @keyframes rot {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <div className="flex items-center justify-center w-full min-h-[50vh]">
        <div className="loader-sharingon">
          <div className="loader-ring">
            <div className="loader-to" />
            <div className="loader-to" />
            <div className="loader-to" />
            <div className="loader-circle" />
          </div>
        </div>
      </div>
    </>
  );
}

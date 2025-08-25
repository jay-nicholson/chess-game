# Chess Game

A modern, interactive chess application built with React, Next.js, and TypeScript.

## Features

- ✨ **Interactive Gameplay**: Drag-and-drop or click-to-move pieces
- 🎯 **Move Validation**: Full chess rule enforcement with helpful error messages
- 👑 **Pawn Promotion**: Choose your promotion piece (Queen, Rook, Bishop, Knight)
- 📊 **Material Tracking**: Visual display of captured pieces with point tallies
- 🎨 **Move Highlighting**: See legal moves when selecting pieces
- ⚡ **Turn Enforcement**: Prevents selecting opponent pieces on their turn
- 🔄 **Game Status**: Real-time check, checkmate, and draw detection
- 📱 **Responsive Design**: Clean, modern UI that works on all devices

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Clone the repository:

```bash
git clone [your-repo-url]
cd Chess
```

2. Install dependencies:

```bash
cd chess-app
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to play!

## How to Play

1. **Select and Move**: Click on a piece to select it, then click on a destination square
2. **Drag and Drop**: Alternatively, drag pieces directly to their destination
3. **Legal Moves**: Yellow highlights show all legal moves for the selected piece
4. **Turn-Based**: Only pieces of the current player can be selected
5. **Pawn Promotion**: When a pawn reaches the end, choose which piece to promote to
6. **Material Advantage**: Track captured pieces and point advantages in real-time

## Technology Stack

- **Frontend**: React 19, Next.js 15
- **Language**: TypeScript
- **Chess Engine**: [chess.js](https://github.com/jhlywa/chess.js)
- **Chess UI**: [react-chessboard](https://github.com/Clariity/react-chessboard)
- **Styling**: CSS-in-JS with React inline styles

## Credits & Acknowledgments

This project is built on top of excellent open-source libraries:

### Chess Logic

- **[chess.js](https://github.com/jhlywa/chess.js)** by Jeff Hlywa
  - License: MIT
  - Provides chess game logic, move validation, and game state management

### Chess Board UI

- **[react-chessboard](https://github.com/Clariity/react-chessboard)** by Ryan Gregory
  - License: MIT
  - Provides the beautiful, interactive chess board component

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Future Enhancements

- [ ] Online multiplayer support
- [ ] Game history and move notation
- [ ] AI opponent with difficulty levels
- [ ] Opening book and analysis
- [ ] Custom board themes
- [ ] Tournament mode
- [ ] Save/load games

---

Made with ❤️ using React and the amazing chess.js and react-chessboard libraries.

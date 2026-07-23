'use client';

// Ré-export de `yet-another-react-lightbox` + son CSS, isolé dans son propre
// module client pour que `dynamic(() => import('./lightbox-lazy'))` code-splitte
// le JS **et** la feuille de style hors du bundle initial des pages publiques.
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

export default Lightbox;

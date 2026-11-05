<?php

namespace Dyg81\ModalBundle\Controller;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Translation\TranslatorBagInterface;
use Twig\Environment;

class ModalController
{
    /**
     * @var Environment
     */
    private $twig;

    /**
     * @var TranslatorBagInterface
     */
    private $translatorBag;

    public function __construct(Environment $twig, TranslatorBagInterface $translatorBag)
    {
        $this->twig = $twig;
        $this->translatorBag = $translatorBag;
    }

    /**
     * Helper function to display a simple translatable message in a modal.
     *
     * The link to this route should have the class "modal-open" and the
     * query parameter "key" pointing to a translation key in the
     * Dyg81ModalBundle domain.
     */
    public function openMessageModalAction(Request $request)
    {
        $key = $request->query->get('key');

        if (!\is_string($key) || '' === trim($key)) {
            throw new NotFoundHttpException('Missing modal message key.');
        }

        $catalogue = $this->translatorBag->getCatalogue($request->getLocale());

        if (!$catalogue->has($key, 'Dyg81ModalBundle')) {
            throw new NotFoundHttpException(sprintf('Unknown modal message key "%s".', $key));
        }

        $message = $catalogue->get($key, 'Dyg81ModalBundle');

        return new Response($this->twig->render('@Dyg81Modal/messageModal.html.twig', [
            'message' => $message,
        ]));
    }

    /**
     * Helper function to open a simple confirm modal.
     *
     * The link to this route should have the attributes:
     *  class: modal-open-confirm
     *  data-modal-href: {{ path('dyg81_modal_open_confirm') }}
     */
    public function openConfirmModalAction()
    {
        return new Response($this->twig->render('@Dyg81Modal/baseConfirmModal.html.twig'));
    }
}

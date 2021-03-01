<?php

namespace Dyg81\ModalBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\Routing\Annotation\Route;

class ModalController extends Controller
{
    /**
     * Helper function to display a simple translatable message in a modal.
     * The link to this route should have the attributes:
     *  class: modal-open
     *
     * @Route("/modal/open/{message}", name="dyg81_modal_open_message")
     *
     * @author Donald Yañez González <donald.yanez@gmail.com>
     */
    public function openMessageModalAction($message)
    {
        return $this->render('@Dyg81Modal/messageModal.html.twig', [
            'message' => $this->get('translator')->trans($message),
        ]);
    }

    /**
     * Helper function to open a simple confirm modal.
     * The link to this route should have the attributes:
     *  class: modal-open-confirm
     *  data-modal-href: {{ path('dyg81_modal_open_confirm') }}
     *
     * @Route("/modal/confirm", name="dyg81_modal_open_confirm")
     *
     * @author Donald Yañez González <donald.yanez@gmail.com>
     */
    public function openConfirmModalAction()
    {
        return $this->render('@Dyg81Modal/baseConfirmModal.html.twig');
    }
}
